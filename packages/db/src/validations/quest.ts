import { z } from "zod";
import { questStatusEnum } from "../schema/quest.enums";

const questStatusSchema = z.enum(questStatusEnum.enumValues);

export const createQuestSchema = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(10_000),
  category: z.string().trim().max(60).nullish(),
  criteria: z.string().trim().max(5_000).nullish(),
  rewardAmount: z.string().regex(/^\d{1,18}(\.\d{1,18})?$/),
  tokenId: z.string().uuid(),
  isBoosted: z.boolean().optional(),
  validationChecklist: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  deadline: z.string().datetime({ offset: true }),
  milestones: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  maxParticipants: z.number().int().min(0).max(100).default(3),
  submitWindowHours: z.number().int().min(1).max(720).default(72),
  reviewWindowHours: z.number().int().min(1).max(168).default(72),
  maxAttempts: z.number().int().min(1).max(5).default(3),
});

export const updateQuestSchema = z.object({
  id: z.string().uuid(),
  data: createQuestSchema.partial(),
});

export const questIdSchema = z.object({ id: z.string().uuid() });

export const confirmQuestSchema = z.object({
  chainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const listQuestsSchema = z.object({
  status: questStatusSchema.exclude(["DRAFT"]).optional(),
  chainId: z.number().int().positive().optional(),
  tokenId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

export const mineQuestsSchema = listQuestsSchema
  .pick({ limit: true, cursor: true })
  .extend({ status: questStatusSchema.optional() });