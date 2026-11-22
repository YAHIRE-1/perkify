import { ORPCError } from "@orpc/server";
import { questSubmission, questEvidenceFile, type ChecklistResponse } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { recordNotification } from "../../lib/notification-mail";
import { maxEvidenceBytes, MAX_FILES, MAX_LINKS } from "../../lib/evidence";
import { hoursFromNow } from "../../lib/participations";
import { objectSize } from "../../lib/storage";

export const submitEvidence = protectedProcedure
  .route({ method: "POST", path: "/{id}/submit" })
  .input(
    z.object({
      checklist: z.array(z.object({
        item: z.string().trim().min(1).max(200),
        proof: z.object({
          kind: z.enum(["link", "file"]),
          index: z.number().int().min(0),
        }).optional(),
      })).max(20).default([]),
      id: z.string().uuid(), // questId
      notes: z.string().trim().max(2000).default(""),
      links: z.array(z.url({ protocol: /^https?$/ })).max(MAX_LINKS).default([]),
      files: z
        .array(
          z.object({
            key: z.string(),
            name: z.string().max(200),
            contentType: z.string(),
            size: z.number().int().positive(),
          }),
        )
        .max(MAX_FILES)
        .default([]),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    if (input.notes.length < 10 && !input.links.length && !input.files.length && !input.checklist.length) {
      throw new ORPCError("BAD_REQUEST", { message: "Add notes, mark a checklist item, or attach a link or file." });
    }

    const [p] = await context.db
      .select()
      .from(questParticipation)
      .where(and(eq(questParticipation.questId, input.id), eq(questParticipation.hunterId, userId)));
    if (!p) throw new ORPCError("FORBIDDEN", { message: "No participas en esta quest" });

    // I/O al bucket fuera de la transacción
    for (const f of input.files) {
      const limit = maxEvidenceBytes(f.contentType);
      if (!limit || f.size > limit || !f.key.startsWith(`evidence/${input.id}/${p.id}/`)) {
        throw new ORPCError("BAD_REQUEST", { message: `Archivo inválido: ${f.name}` });
      }
      if ((await objectSize(f.key)) !== f.size) {
        throw new ORPCError("BAD_REQUEST", { message: `No se encontró ${f.name} en el almacenamiento` });
      }
    }

    return context.db.transaction(async (tx) => {
      const [q] = await tx.select().from(quest).where(eq(quest.id, input.id)).for("update");
      const now = new Date();
      if (!q || q.status !== "FUNDED" || q.deadline <= now || q.cancelExpiresAt !== null) {
        throw new ORPCError("CONFLICT", { message: "Esta quest ya no acepta evidencia" });
      }

      const fileRows = input.files.map((file) => ({ ...file, id: crypto.randomUUID() }));
      const checklistResponses = new Map<string, ChecklistResponse>();
      for (const { item, proof } of input.checklist) {
        if (!q.validationChecklist.includes(item) || checklistResponses.has(item)) {
          throw new ORPCError("BAD_REQUEST", { message: "Select each checklist item at most once." });
        }
        let attachment: ChecklistResponse["proof"] = null;
        if (proof?.kind === "link") {
          const url = input.links[proof.index];
          if (url) attachment = { kind: "link", url };
        } else if (proof?.kind === "file") {
          const file = fileRows[proof.index];
          if (file) attachment = { kind: "file", fileId: file.id };
        }
        if (proof && !attachment) {
          throw new ORPCError("BAD_REQUEST", { message: "Choose an attachment included in this submission." });
        }
        checklistResponses.set(item, { item, proof: attachment });
      }
      if (q.checklistProofRequired.some((item) => !checklistResponses.get(item)?.proof)) {
        throw new ORPCError("BAD_REQUEST", { message: "Add proof for every checklist item that requires it." });
      }

      // Atómico: si el plazo venció un instante antes, no actualiza nada
      const [updated] = await tx
        .update(questParticipation)
        .set({ status: "SUBMITTED" })
        .where(
          and(
            eq(questParticipation.id, p.id),
            eq(questParticipation.status, "JOINED"),
            gt(questParticipation.expiresAt, now),
          ),
        )
        .returning();
      if (!updated) throw new ORPCError("CONFLICT", { message: "Tu plazo para enviar evidencia venció" });

      const [sub] = await tx
        .insert(questSubmission)
        .values({
          participationId: p.id,
          notes: input.notes,
          checklistResponses: [...checklistResponses.values()],
          links: input.links,
          reviewDeadline: hoursFromNow(q.reviewWindowHours),
        })
        .returning();

      if (!sub) throw new ORPCError("INTERNAL_SERVER_ERROR");
      if (fileRows.length) {
        await tx.insert(questEvidenceFile)
          .values(fileRows.map((file) => ({ submissionId: sub.id, ...file })));
      }
      await recordNotification(tx, q.creatorId, q, "SUBMITTED");
      return sub;
    });
  });
