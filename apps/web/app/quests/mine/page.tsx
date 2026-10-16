'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/api/client';
import type { Page, QuestFilters } from '@/api/types';
import type { Quest } from '@perkify/db';
import QuestCard from '@/components/QuestCard';
import QuestFiltersBar from '@/components/QuestFilters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

const LIMIT = 9;

export default function MyQuests() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<QuestFilters>({ page: 1, limit: LIMIT });
  const [data, setData] = useState<Page<Quest> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setData(null); setErr(null);
    api.quests.mine(filters).then(setData).catch((e) => setErr(e.message));
  }, [user, filters]);

  if (authLoading || !user) {
    return <div className="muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">My quests</h1>
      </div>
      <QuestFiltersBar value={filters} onChange={setFilters} hideTokenAndBoostFilters={false} />
      {err ? <EmptyState title="Could not load your quests" hint={err} />
        : !data ? <div className="muted">Loading…</div>
        : data.items.length === 0 ? <EmptyState title="You don't have any quests yet" hint="Create your first quest." />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((q) => (
              <QuestCard key={q.id} quest={q} isOwner />
            ))}
          </div>}
      {data && <Pagination page={filters.page ?? 1} total={data.total} limit={LIMIT} onChange={(page) => setFilters({ ...filters, page })} />}
    </div>
  );
}