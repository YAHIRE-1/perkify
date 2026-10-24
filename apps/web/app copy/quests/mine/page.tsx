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
const STATUSES: QuestStatus[] = ['DRAFT', 'FUNDED', 'APPROVED', 'DISPUTED', 'COMPLETED', 'CANCELLED'];

export default function MyQuests() {
  const { user } = useAuth();
  const [status, setStatus] = useState<QuestStatus | ''>('');
  const [items, setItems] = useState<QuestSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const res = await orpc.quests.mine({ limit: LIMIT, cursor, status: status || undefined });
        setItems((prev) => (cursor ? [...prev, ...(res.items as QuestSummary[])] : (res.items as QuestSummary[])));
        setNextCursor(res.nextCursor);
      } catch (e) {
        setErr(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    if (user) load();
  }, [load, user]);

  const remove = async (q: QuestSummary) => {
    const warning =
      q.escrowStatus === 'PENDING'
        ? 'This draft was already prepared for funding. If you sent the create transaction, deleting it would leave your funds locked without a linked quest. Delete anyway?'
        : 'Delete this draft?';
    if (!window.confirm(warning)) return;
    try {
      await orpc.quests.delete({ id: q.id });
      setItems((prev) => prev.filter((x) => x.id !== q.id));
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  if (!user) return <EmptyState title="Sign in to see your quests" hint="Connect your wallet and sign in first." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">My quests</h1>
        <Link href="/quests/new" className="btn btn-primary">Create quest</Link>
      </div>

      <select className="input max-w-48" value={status} onChange={(e) => setStatus(e.target.value as QuestStatus | '')}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}

      {loading && items.length === 0 ? (
        <div className="muted">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Create a quest to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              actions={
                q.status === 'DRAFT' ? (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/quests/${q.id}/fund`} className="btn btn-primary">
                      {q.escrowStatus === 'PENDING' ? 'Resume funding' : 'Fund'}
                    </Link>
                    {q.escrowStatus === 'NONE' && (
                      <Link href={`/quests/${q.id}/edit`} className="btn">Edit</Link>
                    )}
                    <button type="button" className="btn" onClick={() => remove(q)}>Delete</button>
                  </div>
                ) : null
              }
            />
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
