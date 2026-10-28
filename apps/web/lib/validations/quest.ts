import { z } from 'zod';
import { parseUnits } from 'viem';

const isPositiveAmount = (value: string, decimals: number) => {
  try {
    return parseUnits(value, decimals) > BigInt(0);
  } catch {
    return false;
  }
};

export const questFormSchema = (decimals: number) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(5, 'The title needs at least 5 characters.')
      .max(120, 'The title cannot exceed 120 characters.'),
    description: z
      .string()
      .trim()
      .min(20, 'The description needs at least 20 characters.')
      .max(10_000, 'The description cannot exceed 10,000 characters.'),
    tokenId: z.string().min(1, 'Choose the reward token.'),
    rewardAmount: z
      .string()
      .regex(/^\d{1,18}(\.\d{1,18})?$/, 'Enter a valid amount (up to 18 integer digits).')
      .refine((v) => isPositiveAmount(v, decimals), 'Enter a valid reward amount greater than 0.'),
    deadline: z
      .string()
      .min(1, 'Select a deadline.')
      .refine((v) => new Date(v).getTime() > Date.now(), 'The deadline must be in the future.'),
    milestones: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Milestones cannot be empty.')
          .max(300, 'Max 300 characters per milestone.'),
      )
      .min(1, 'Add at least one expected milestone.')
      .max(20, 'You can add up to 20 milestones.'),
    category: z.string().trim().max(60, 'The category cannot exceed 60 characters.'),
    criteria: z.string().trim().max(5_000, 'The criteria cannot exceed 5,000 characters.'),
    validationChecklist: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Checklist items cannot be empty.')
          .max(200, 'Max 200 characters per item.'),
      )
      .max(20, 'You can add up to 20 checklist items.'),
  });

export type QuestFormValues = z.infer<ReturnType<typeof questFormSchema>>;

export const EMPTY_QUEST_FORM: QuestFormValues = {
  title: '',
  description: '',
  category: '',
  criteria: '',
  rewardAmount: '',
  deadline: '',
  tokenId: '',
  validationChecklist: [],
  milestones: [],
};