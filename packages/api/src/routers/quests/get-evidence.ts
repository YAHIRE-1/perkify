import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { presignRead } from "../../lib/storage";

export const getEvidence = protectedProcedure
  .route({ method: "GET", path: "/{id}/evidence" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const [q] = await context.db
      .select({ creatorId: quest.creatorId })
      .from(quest)
      .where(eq(quest.id, input.id));
    if (!q) throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });

    // El creador ve todas las participaciones; el hunter, solo la suya
    const isCreator = q.creatorId === userId;
    const rows = await context.db.query.questParticipation.findMany({
      where: { questId: input.id, ...(isCreator ? {} : { hunterId: userId }) },
      with: { hunter: true, submissions: { with: { files: true } } },
    });

    return Promise.all(
      rows.map(async (p) => ({
        id: p.id,
        status: p.status,
        attempts: p.attempts,
        expiresAt: p.expiresAt,
        hunter: { id: p.hunter.id, name: p.hunter.name, image: p.hunter.image }, // sin email ni wallet
        submissions: await Promise.all(
          p.submissions.map(async (s) => ({
            id: s.id,
            notes: s.notes,
            links: s.links,
            status: s.status,
            rejectionReason: s.rejectionReason,
            reviewDeadline: s.reviewDeadline,
            createdAt: s.createdAt,
            files: await Promise.all(
              s.files.map(async (f) => ({
                id: f.id,
                name: f.name,
                contentType: f.contentType,
                size: f.size,
                url: await presignRead(f.key), // 5 min
              })),
            ),
          })),
        ),
      })),
    );
  });
