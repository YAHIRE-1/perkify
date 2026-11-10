import { ORPCError } from "@orpc/server";
import { questParticipation } from "@perkify/db/schema/participations";
import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { EVIDENCE_LIMITS } from "../../lib/evidence";
import { presignUpload } from "../../lib/storage";

export const uploadUrl = protectedProcedure
  .route({ method: "POST", path: "/{id}/evidence/upload-url" })
  .input(
    z.object({
      id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      contentType: z.string(),
      size: z.number().int().positive(),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const limit = EVIDENCE_LIMITS[input.contentType];
    if (!limit) throw new ORPCError("BAD_REQUEST", { message: "Tipo de archivo no permitido" });
    if (input.size > limit) {
      throw new ORPCError("BAD_REQUEST", { message: `Máximo ${limit / 1024 / 1024} MB para este tipo` });
    }

    const [p] = await context.db
      .select()
      .from(questParticipation)
      .where(
        and(
          eq(questParticipation.questId, input.id),
          eq(questParticipation.hunterId, userId),
          eq(questParticipation.status, "JOINED"),
          gt(questParticipation.expiresAt, new Date()),
        ),
      );
    if (!p) throw new ORPCError("FORBIDDEN", { message: "Únete a la quest o tu plazo venció" });

    const safe = input.filename.replace(/[^\w.\-]/g, "_");
    const key = `evidence/${input.id}/${p.id}/${randomUUID()}-${safe}`;
    return { key, url: await presignUpload(key, input.contentType, input.size) };
  });
