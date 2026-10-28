'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestCard from '@/components/QuestCard';
import { QuestsFilters, type QuestFilterValues } from '@/components/quests/quests-filters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useListQuests, type ListInput } from '@/hooks/quest/use-quest';
import { useDebouncedValue } from '@/hooks/use-debounced-value';


const LIMIT = 9;

export default function MyQuests() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<ListInput>({
    page: 1,
    limit: LIMIT,
    mine: true,
  });
  const debouncedFilters = useDebouncedValue(filters, 250);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/dashboard');
  }, [authLoading, user, router]);

  const { data, error, isPending, isPlaceholderData } = useListQuests(
    debouncedFilters,
    { enabled: !!user }
  );

  // `mine` siempre es true en esta vista, y cualquier cambio de filtro regresa a la página 1
  const handleFilterChange = (patch: Partial<QuestFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch, mine: true, page: 1 }));

  if (authLoading || !user) return <div className="muted">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">My quests</h1>
      </div>

      <QuestsFilters
        value={filters}
        onChange={handleFilterChange}
        showMineFilter={false}
      />

      {error ? (
        <EmptyState title="Could not load your quests" hint={error.message} />
      ) : isPending ? (
        <div className="muted">Loading…</div>
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