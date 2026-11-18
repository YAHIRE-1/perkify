'use client';

import { Translate, useLanguage } from '@/lib/i18n/provider';
import { ArrowUpRight, CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';
import { formatReward } from '@/lib/format-reward';
import StatusBadge from './StatusBadge';

type QuestCardQuest = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: string;
  rewardAmount?: string | number | null;
  token?: { symbol?: string | null } | null;
  deadline: string | number | Date;
  maxParticipants?: number;
  taken?: number;
  isBoosted?: boolean;
  isOwner?: boolean;
};

type QuestCardProps = {
  quest: QuestCardQuest;
  isOwner?: boolean;
};

export default function QuestCard({ quest: q, isOwner }: QuestCardProps) {
  const { locale, t } = useLanguage();
  const canEdit = (isOwner ?? q.isOwner) && q.status === 'DRAFT';
  const reward = formatReward(q.rewardAmount);
  const symbol = q.token?.symbol;
  const deadline = new Date(q.deadline);
  const expired = deadline.getTime() <= Date.now();
  const spots = q.maxParticipants !== undefined && q.maxParticipants > 0 && q.taken !== undefined
    ? Math.max(0, q.maxParticipants - q.taken)
    : null;

  return (
    <article className="surface group flex min-w-0 flex-col transition-colors hover:border-[var(--accent-text)] focus-within:border-[var(--accent-text)]">
      <Link
        href={`/quests/${q.id}`}
        aria-label={t("View quest: {title}", { title: q.title })}
        className="flex min-w-0 flex-1 flex-col gap-4 rounded-[var(--radius)] p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          {expired && q.status === 'FUNDED' ? (
            <span className="chip"><Translate text={"Expired"} /></span>
          ) : (
            <StatusBadge status={q.status} />
          )}
          {q.category && (
            <span className="min-w-0 truncate text-xs font-medium text-[var(--muted)]">
              {q.category}
            </span>
          )}
          {q.isBoosted && <span className="chip chip-boost"><Translate text={"Boosted"} /></span>}
        </div>

        <div className="space-y-1.5">
          <h2 className="font-display line-clamp-2 wrap-anywhere text-xl font-semibold leading-snug">
            {q.title}
          </h2>
          {q.description && (
            <p className="line-clamp-2 wrap-anywhere text-sm leading-relaxed text-[var(--muted)]">
              {q.description}
            </p>
          )}
        </div>

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs text-[var(--muted)]">
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5" />
            <time dateTime={deadline.toISOString()}>
              {t(expired ? "Closed {date}" : "Closes {date}", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(deadline) })}
            </time>
          </li>
          {q.status === 'FUNDED' && !expired && spots !== null && (
            <li className="flex items-center gap-1.5">
              <Users aria-hidden className="size-3.5" />
              {spots === 0 ? t("Full") : t(spots === 1 ? "{count} spot left" : "{count} spots left", { count: spots })}
            </li>
          )}
        </ul>

        <div className="flex items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)]"><Translate text={"Reward"} /></p>
            <p
              className="font-display flex min-w-0 items-baseline gap-1.5 text-2xl font-bold text-[var(--accent-text)]"
              title={`${reward.full} ${symbol ?? ''}`.trim()}
            >
              <span className="truncate">{reward.text}</span>
              {symbol && <span className="truncate text-sm">{symbol}</span>}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 pb-0.5 text-xs font-semibold text-[var(--muted)] group-hover:text-[var(--accent-text)] group-focus-within:text-[var(--accent-text)]"><Translate text={"Details"} />{' '}<ArrowUpRight aria-hidden className="size-4" />
          </span>
        </div>
      </Link>

      {canEdit && (
        <div className="border-t border-[var(--border)] px-5 py-3">
          <Link href={`/quests/${q.id}/edit`} className="text-sm font-semibold text-[var(--accent-text)] hover:underline"><Translate text={"Edit draft"} /></Link>
        </div>
      )}
    </article>
  );
}
