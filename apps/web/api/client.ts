import type { Dispute, Page, Quest, QuestFilters } from './types';
import type { UserRow as User } from '@perkify/db';

const BASE = process.env.NEXT_PUBLIC_API_URL;
const KEY = 'prky_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(KEY)),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      Array.isArray(body.message) ? body.message.join(', ') : body.message ?? res.statusText,
    );
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

function toPage<T>(r: any): Page<T> {
  if (Array.isArray(r)) return { items: r, total: r.length };
  const items = r.items ?? r.data ?? [];
  return { items, total: r.total ?? r.meta?.total ?? items.length };
}

const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : '';
};

const json = (b: unknown) => JSON.stringify(b);

export const api = {
  nonce: (address: string) => req<{ nonce: string }>('/api/auth/siwe/nonce', { method: 'POST', body: json({ address }) }),
  verify: (message: string, signature: string) =>
    req<{ accessToken: string }>('/api/auth/siwe/verify', { method: 'POST', body: json({ message, signature }) }),
  me: () => req<User>('/api/me'),
  updateMe: (d: Partial<Pick<User, 'avatarUrl' | 'bio' | 'name'>>) => req<User>('/api/me', { method: 'PATCH', body: json(d) }),

  quests: {
    list: async (f: QuestFilters = {}) => toPage<Quest>(await req(`/quests${qs({ ...f })}`)),
    mine: async (f: QuestFilters = {}) => toPage<Quest>(await req(`/quests/mine${qs({ ...f })}`)),
    get: (id: string) => req<Quest>(`/quests/${id}`),
    create: (d: Partial<Quest>) => req<Quest>('/quests', { method: 'POST', body: json(d) }),
    update: (id: string, d: Partial<Quest>) => req<Quest>(`/quests/${id}`, { method: 'PATCH', body: json(d) }),
    remove: (id: string) => req<void>(`/quests/${id}`, { method: 'DELETE' }),
  },
  escrow: {
    prepareDeposit: (questId: string) =>
      req<{ to: string; data: string; value?: string }>('/escrow/prepare-deposit', {
        method: 'POST',
        body: json({ questId }),
      }),
    status: (questId: string) => req<{ status: string; [k: string]: unknown }>(`/escrow/status/${questId}`),
  },
  disputes: {
    list: async () => toPage<Dispute>(await req('/disputes')),
  },
};