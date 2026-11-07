import { pgEnum } from "drizzle-orm/pg-core";

export const questStatusEnum = pgEnum("quest_status", [
  "DRAFT", "FUNDED", "CLAIMED", "SUBMITTED", "COMPLETED", "CANCELLED", "EXPIRED",
  "APPROVED", "DISPUTED",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "NONE", "PENDING", "LOCKED", "RELEASED", "REFUNDED",
]);


// Proceso de participación en quest
export const participationStatusEnum = pgEnum("participation_status", [
  "JOINED", "SUBMITTED", "APPROVED", "PAID", "REJECTED", "LOST", "ABANDONED",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "PENDING", "APPROVED", "REJECTED",
]);

export type QuestStatus = (typeof questStatusEnum.enumValues)[number];
export type EscrowStatus = (typeof escrowStatusEnum.enumValues)[number];