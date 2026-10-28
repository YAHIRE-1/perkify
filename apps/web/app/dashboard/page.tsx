'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { AppRouterInputs } from '@perkify/api/routers/index';
import QuestCard from '@/components/QuestCard';
import { QuestsFilters, type QuestFilterValues } from '@/components/quests/quests-filters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useListQuests } from '@/hooks/quest/use-quest';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const LIMIT = 9;

type Filters = AppRouterInputs['quests']['list'];

export default function Marketplace() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: LIMIT });
  const debouncedFilters = useDebouncedValue(filters, 250);

  const { data, error, isPending, isPlaceholderData } = useListQuests(debouncedFilters);

  const handleFilterChange = (patch: Partial<QuestFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Open quests</h1>
          <p className="muted mt-1">Take a quest, submit evidence, and get paid from escrow.</p>
        </div>
        {user && <Link href="/quests/new" className="btn btn-primary">Create quest</Link>}
      </div>

      <QuestsFilters
        value={filters}
        onChange={handleFilterChange}
        showMineFilter={!!user}
      />

      {error ? (
        <EmptyState title="Could not load quests" hint={error.message} />
      ) : isPending ? (
        <div className="muted">Loading…</div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No results found"
          hint="Try adjusting your filters or create the first quest."
        />
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {data.items.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={filters.page ?? 1}
          total={data.total}
          limit={LIMIT}
          onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}