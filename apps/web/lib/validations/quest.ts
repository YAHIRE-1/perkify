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
    description: z.string().trim().min(20, 'The description needs at least 20 characters.'),
    tokenId: z.string().min(1, 'Choose the reward token.'),
    rewardAmount: z
      .string()
      .refine((v) => isPositiveAmount(v, decimals), 'Enter a valid reward amount greater than 0.'),
    deadline: z.string().min(1, 'Select a deadline.'),
    milestones: z.array(z.string()).min(1, 'Add at least one expected milestone.'),
    category: z.string().trim().max(60),
    criteria: z.string().trim(),
    validationChecklist: z.array(z.string()),
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