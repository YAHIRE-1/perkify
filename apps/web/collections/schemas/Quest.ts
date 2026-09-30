// lib/schemas/quest.ts
import { z } from 'zod';

export const QuestStatusSchema = z.enum([
  'DRAFT',
  'FUNDED',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'DISPUTED',
  'RESOLVED',
  'CLOSED',
]);
export type QuestStatus = z.infer<typeof QuestStatusSchema>;

export const QuestMilestoneSchema = z.object({
  id: z.string(),
  description: z.string(),
});
export type QuestMilestone = z.infer<typeof QuestMilestoneSchema>;

export const QuestSchema = z.object({
  id: z.string().uuid(),
  creatorId: z.string().uuid(),
  hunterId: z.string().uuid().nullable().optional(),
  title: z.string(),
  description: z.string(),
  status: QuestStatusSchema,
  rewardAmount: z.string(),
  acceptedTokenSymbol: z.string(),
  acceptedTokenAddress: z.string(),
  deadline: z.string(), // ISO date string
  isBoosted: z.boolean(),
  validationChecklist: z.array(z.string()),
  milestones: z.array(QuestMilestoneSchema),
  claimedAt: z.string().nullable().optional(),
  claimDeadline: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  reviewDeadline: z.string().nullable().optional(),
  escrowId: z.string().nullable().optional(),
  escrowContractAddress: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Quest = z.infer<typeof QuestSchema>;

export const PageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
  });

export interface QuestFilters {
  status?: QuestStatus;
  search?: string;
  createdBy?: string; // ojo: si el backend filtra por creatorId, revisar FilterQuestsQueryDto
  category?: string;
  boosted?: boolean;
  token?: string; // symbol o address, según lo soporte el DTO de filtros
  page?: number;
  limit?: number;
}  

export const QuestPageSchema = PageSchema(QuestSchema);
export type QuestPage = z.infer<typeof QuestPageSchema>;