import { ORPCError } from "@orpc/server";
import { questSubmission, questEvidenceFile } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { EVIDENCE_LIMITS, MAX_FILES } from "../../lib/evidence";
import { hoursFromNow } from "../../lib/participations";
import { objectSize } from "../../lib/storage";

export const submitEvidence = protectedProcedure
  .route({ method: "POST", path: "/{id}/submit" })
  .input(
    z.object({
      id: z.string().uuid(), // questId
      notes: z.string().trim().min(10).max(2000),
      links: z.array(z.string().url()).max(10).default([]),
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

    if (!input.links.length && !input.files.length) {
      throw new ORPCError("BAD_REQUEST", { message: "Agrega al menos un link o archivo" });
    }

    const [p] = await context.db
      .select()
      .from(questParticipation)
      .where(and(eq(questParticipation.questId, input.id), eq(questParticipation.hunterId, userId)));
    if (!p) throw new ORPCError("FORBIDDEN", { message: "No participas en esta quest" });

    // I/O al bucket fuera de la transacción
    for (const f of input.files) {
      const limit = EVIDENCE_LIMITS[f.contentType];
      if (!limit || f.size > limit || !f.key.startsWith(`evidence/${input.id}/${p.id}/`)) {
        throw new ORPCError("BAD_REQUEST", { message: `Archivo inválido: ${f.name}` });
      }
      if ((await objectSize(f.key)) !== f.size) {
        throw new ORPCError("BAD_REQUEST", { message: `No se encontró ${f.name} en el almacenamiento` });
      }
    }

    return context.db.transaction(async (tx) => {
      const now = new Date();

      const [q] = await tx.select().from(quest).where(eq(quest.id, input.id));
      if (!q || q.status !== "FUNDED" || q.deadline <= now) {
        throw new ORPCError("CONFLICT", { message: "Esta quest ya no acepta evidencia" });
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
          links: input.links,
          reviewDeadline: hoursFromNow(q.reviewWindowHours),
        })
        .returning();

      if (input.files.length) {
        await tx
          .insert(questEvidenceFile)
          .values(input.files.map((f) => ({ submissionId: sub!.id, ...f })));
      }
      return sub;
    });
  });
