export type Role = 'HUNTER' | 'BUYER' | 'ADMIN';
export type {
  Quest,
  QuestSummary,
  QuestStatus,
  EscrowStatus,
  CreateQuestInput,
  UpdateQuestInput,
} from '@perkify/db';


export interface Dispute { id: string; questId?: string; status?: string; reason?: string; createdAt?: string }
export interface Page<T> { items: T[]; total: number }
export interface QuestFilters { search?: string; token?: string; category?: string; boosted?: boolean; page?: number; limit?: number }
