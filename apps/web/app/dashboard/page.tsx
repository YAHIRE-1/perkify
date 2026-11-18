'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { AppRouterInputs } from '@perkify/api/routers/index';
import QuestCard from '@/components/QuestCard';
import { QuestsFilters, type QuestFilterValues } from '@/components/quests/quests-filters';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useListQuests } from '@/hooks/quest/use-quest';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import styles from './marketplace.module.css';

const LIMIT = 9;

type Filters = AppRouterInputs['quests']['list'];

export default function Marketplace() {
  const { user, login } = useAuth();
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: LIMIT });
  const debouncedFilters = useDebouncedValue(filters, 250);
  const { data, error, isPending, isPlaceholderData } = useListQuests(debouncedFilters);
  const hasFilters = Boolean(filters.search?.trim() || filters.category?.trim() || filters.isBoosted);

  const handleFilterChange = (patch: Partial<QuestFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  return (
    <div className="space-y-6">
      <header className={`${styles.intro} flex flex-wrap items-end justify-between gap-5 p-5 sm:p-8`}>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Quest marketplace</h1>
          <p className="max-w-md text-sm text-[var(--muted)] sm:text-base">
            Find a funded quest, submit your work, and earn rewards from escrow.
          </p>
        </div>
        {user ? (
          <Link href="/quests/new" className="btn btn-primary">
            <Plus aria-hidden className="size-4" /> Create quest
          </Link>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => login().catch((e) => alert(e.message))}
          >
            <Plus aria-hidden className="size-4" /> Create quest
          </button>
        )}
      </header>

      <div className="surface p-4 sm:p-5">
        <QuestsFilters value={filters} onChange={handleFilterChange} />
      </div>

      <section aria-busy={isPending || isPlaceholderData} aria-labelledby="marketplace-results" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="marketplace-results" className="font-display text-xl font-semibold">Funded quests</h2>
          {data && !error && !isPlaceholderData && (
            <p aria-live="polite" className="text-sm tabular-nums text-[var(--muted)]">
              {data.total} {data.total === 1 ? 'quest' : 'quests'}
            </p>
          )}
        </div>

        {error ? (
          <EmptyState title="Could not load quests" hint={error.message} />
        ) : isPending ? (
          <>
            <p className="sr-only" role="status">Loading quests</p>
            <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="surface h-48 motion-safe:animate-pulse" />
              ))}
            </div>
          </>
        ) : data.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No matching quests' : 'No funded quests yet'}
            hint={hasFilters ? 'Try changing the search or clearing a filter.' : 'Funded quests will appear here.'}
          />
        ) : (
          <div
            className={`${styles.cards} grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
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
      </section>
    </div>
  );
}
