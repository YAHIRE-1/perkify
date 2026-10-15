export type Role = 'HUNTER' | 'BUYER' | 'ADMIN';
export type QuestStatus = 'draft' | 'open' | 'funded' | 'in_progress' | 'submitted' | 'completed' | 'disputed' | 'cancelled' | string;

export interface Quest {
  id: string; title: string; description: string; reward: string | number; token: string;
  category?: string; deadline?: string; status: QuestStatus; boosted?: boolean;
  criteria?: string; checklist?: string[]; createdAt?: string;
}
export interface Dispute { id: string; questId?: string; status?: string; reason?: string; createdAt?: string }
export interface Page<T> { items: T[]; total: number }
export interface QuestFilters { search?: string; token?: string; category?: string; boosted?: boolean; page?: number; limit?: number }
