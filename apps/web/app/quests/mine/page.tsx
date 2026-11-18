'use client';
import { Translate } from '@/lib/i18n/provider';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestCard from '@/components/QuestCard';
import { QuestsFilters, type QuestFilterValues } from '@/components/quests/quests-filters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useMyQuests, type ListInput } from '@/hooks/quest/use-quest';
import { useDebouncedValue } from '@/hooks/use-debounced-value';


const LIMIT = 9;

export default function MyQuests() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<ListInput>({
    page: 1,
    limit: LIMIT,
  });
  const debouncedFilters = useDebouncedValue(filters, 250);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/dashboard');
  }, [authLoading, user, router]);

  const { data, error, isPending, isPlaceholderData } = useMyQuests(debouncedFilters, !!user);

  const handleFilterChange = (patch: Partial<QuestFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  if (authLoading || !user) return <div className="muted"><Translate text={"Loading…"} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold"><Translate text={"My quests"} /></h1>
      </div>

      <QuestsFilters
        value={filters}
        onChange={handleFilterChange}
      />

      {error ? (
        <EmptyState title="Could not load your quests" hint={error.message} />
      ) : isPending ? (
        <div className="muted"><Translate text={"Loading…"} /></div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="You don't have any quests yet"
          hint="Create your first quest."
        />
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {data.items.map((q) => (
            <QuestCard key={q.id} quest={q} isOwner />
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