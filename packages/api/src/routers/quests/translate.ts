import { createHash } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { quest, questMilestones } from "@perkify/db/schema/quests";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../index";

const providerResult = z.object({
  data: z.object({ translations: z.array(z.object({ translatedText: z.string() })) }),
});
const cache = new Map<string, Promise<string[]>>();

async function translateText(text: string[], target: string, apiKey: string) {
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({ q: text, target, format: "text" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Translation provider rejected the request");
  const result = providerResult.parse(await response.json());
  if (result.data.translations.length !== text.length) throw new Error("Incomplete translation");
  return result.data.translations.map(({ translatedText }) => translatedText);
}

export const translate = protectedProcedure
  .route({ method: "POST", path: "/{id}/translation" })
  .input(z.object({ id: z.string().uuid(), locale: z.enum(["en", "es", "zh-CN"]) }))
  .handler(async ({ input, context }) => {
    const [content] = await context.db.select({
      title: quest.title,
      description: quest.description,
      criteria: quest.criteria,
      checklist: quest.validationChecklist,
    }).from(quest).where(and(eq(quest.id, input.id), ne(quest.status, "DRAFT"), isNull(quest.archived)));
    if (!content) throw new ORPCError("NOT_FOUND");

    const apiKey = context.questTranslationApiKey;
    if (!apiKey) {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Quest translation is currently unavailable." });
    }

    const milestones = await context.db.select({
      id: questMilestones.id,
      description: questMilestones.description,
    }).from(questMilestones).where(eq(questMilestones.questId, input.id))
      .orderBy(asc(questMilestones.position), asc(questMilestones.id));

    const text = [content.title, content.description, ...(content.criteria ? [content.criteria] : []),
      ...content.checklist, ...milestones.map((item) => item.description)];
    const key = createHash("sha256").update(JSON.stringify([input.locale, text])).digest("hex");
    let pending = cache.get(key);
    if (!pending) {
      pending = translateText(text, input.locale, apiKey);
      if (cache.size >= 128) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, pending);
    }

    try {
      const result = await pending;
      const checklistStart = content.criteria ? 3 : 2;
      const milestoneStart = checklistStart + content.checklist.length;
      return {
        title: result[0],
        description: result[1],
        criteria: content.criteria ? result[2] : content.criteria,
        checklist: result.slice(checklistStart, milestoneStart),
        milestones: milestones.map(({ id, description }, index) => ({
          id,
          description: result[milestoneStart + index] ?? description,
        })),
      };
    } catch {
      if (cache.get(key) === pending) cache.delete(key);
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Quest translation is currently unavailable." });
    }
  });
