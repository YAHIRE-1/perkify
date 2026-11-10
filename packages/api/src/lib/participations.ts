// lib/participations.ts
import { questParticipation } from "@perkify/db/schema/participations";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import type { Context } from "../context"; // ajusta la ruta a tu tipo de context

export type Tx = Parameters<Parameters<Context["db"]["transaction"]>[0]>[0];

// Un JOINED vencido no ocupa cupo (expiración perezosa, sin cron)
export const occupiesSlot = (now: Date) =>
  or(
    and(eq(questParticipation.status, "JOINED"), gt(questParticipation.expiresAt, now)),
    inArray(questParticipation.status, ["SUBMITTED", "APPROVED", "PAID"]),
  );

export const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

export const submitDeadline = (hours: number, questDeadline: Date) =>
  new Date(Math.min(hoursFromNow(hours).getTime(), questDeadline.getTime()));
