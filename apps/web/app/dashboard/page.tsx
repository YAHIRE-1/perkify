'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/api/client';
import type { Page, QuestFilters, QuestSummary } from '@/api/types';
import QuestCard from '@/components/QuestCard';
import QuestFiltersBar from '@/components/QuestFilters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

const LIMIT = 9;

export default function Marketplace() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<QuestFilters>({ page: 1, limit: LIMIT });
  const [data, setData] = useState<Page<QuestSummary> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setErr(null);
    const t = setTimeout(() => api.quests.list(filters).then(setData).catch((e) => setErr(e.message)), 250);
    return () => clearTimeout(t);
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Open quests</h1>
          <p className="muted mt-1">Take a quest, submit evidence, and get paid from escrow.</p>
        </div>
        {user && <Link href="/quests/new" className="btn btn-primary">Create quest</Link>}
      </div>
      <QuestFiltersBar value={filters} onChange={setFilters} />
      {err ? <EmptyState title="Could not load quests" hint={err} />
        : !data ? <div className="muted">Loading…</div>
        : data.items.length === 0 ? <EmptyState title="No results found" hint="Try adjusting your filters or create the first quest." />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((q) => <QuestCard key={q.id} quest={q} />)}</div>}
      {data && <Pagination page={filters.page ?? 1} total={data.total} limit={LIMIT} onChange={(page) => setFilters({ ...filters, page })} />}
    </div>
  );
}