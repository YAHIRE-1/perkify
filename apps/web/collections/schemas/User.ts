import { Role } from '@/lib/types';

export interface User {
  id: string;
  walletAddress: string;
  nonce?: string | null;
  role: Role;
  name?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
}