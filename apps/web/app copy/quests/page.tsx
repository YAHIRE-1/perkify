'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { QuestStatus, QuestSummary } from '@perkify/db';
import { orpc, errorMessage } from '@/lib/orpc';
import QuestCard from '@/components/quests/QuestCard';
import { STATUS_LABELS } from '@/components/quests/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

const LIMIT = 12;
const STATUSES: Exclude<QuestStatus, 'DRAFT'>[] = ['FUNDED', 'APPROVED', 'DISPUTED', 'COMPLETED', 'CANCELLED'];

export default function Marketplace() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Exclude<QuestStatus, 'DRAFT'> | ''>('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<QuestSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const res = await orpc.quests.list({
          limit: LIMIT,
          cursor,
          status: status || undefined,
          category: category.trim() || undefined,
        });
        setItems((prev) => (cursor ? [...prev, ...(res.items as QuestSummary[])] : (res.items as QuestSummary[])));
        setNextCursor(res.nextCursor);
      } catch (e) {
        setErr(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [status, category],
  );

  // Los filtros reinician la lista; la categoría se debouncea.
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Open quests</h1>
          <p className="muted mt-1">Take a quest, submit evidence, and get paid from escrow.</p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Link href="/quests/mine" className="btn">My quests</Link>
            <Link href="/quests/new" className="btn btn-primary">Create quest</Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input max-w-48" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input
          className="input max-w-56"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {err ? (
        <EmptyState title="Could not load quests" hint={err} />
      ) : loading && items.length === 0 ? (
        <div className="muted">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No results found" hint="Try adjusting your filters or create the first quest." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <button className="btn" disabled={loading} onClick={() => load(nextCursor)}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
