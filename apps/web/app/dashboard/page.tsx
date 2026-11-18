'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useState } from 'react';
import QuestCard from '@/components/QuestCard';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useListQuests } from '@/hooks/quest/use-quest';
import styles from './marketplace.module.css';

const LIMIT = 9;

export default function Marketplace() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const { data, error, isPending, isPlaceholderData } = useListQuests({ page, limit: LIMIT });

  return (
    <div className="space-y-6">
      <header className={`${styles.intro} flex flex-wrap items-end justify-between gap-5 p-5 sm:p-8`}>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl"><Translate text={"Quest marketplace"} /></h1>
          <p className="max-w-md text-sm text-[var(--muted)] sm:text-base"><Translate text={"Find a quest, submit your work, and earn rewards from escrow."} /></p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {data && !error && !isPlaceholderData && (
            <p aria-live="polite" className="flex items-center gap-2 text-sm tabular-nums text-[var(--muted)]">
              <span aria-hidden className="size-2 rounded-full bg-[var(--accent-text)] motion-safe:animate-pulse" />
              {t(data.total === 1 ? "{count} quest available" : "{count} quests available", { count: data.total })}
            </p>
          )}
        </div>
      </header>

      <section aria-busy={isPending || isPlaceholderData} aria-label={t("Marketplace quests")} className="space-y-3">
        {error ? (
          <EmptyState title="Could not load quests" hint={error.message} />
        ) : isPending ? (
          <>
            <p className="sr-only" role="status"><Translate text={"Loading quests"} /></p>
            <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="surface h-48 motion-safe:animate-pulse" />
              ))}
            </div>
          </>
        ) : data.items.length === 0 ? (
          <EmptyState
            title="No funded quests yet"
            hint="Funded quests will appear here."
          />
        ) : (
          <div
            className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
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
            page={page}
            total={data.total}
            limit={LIMIT}
            onChange={setPage}
          />
        )}
      </section>
    </div>
  );
}
