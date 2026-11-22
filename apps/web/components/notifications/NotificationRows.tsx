'use client';

import type { AppRouterOutputs } from '@perkify/api/routers/index';
import { ArrowUpRight, Bell } from 'lucide-react';
import Link from 'next/link';
import { Translate, useLanguage } from '@/lib/i18n/provider';

type NotificationItem = AppRouterOutputs['notifications']['list']['items'][number];

type NotificationRowsProps = {
  items: readonly NotificationItem[];
  onRead: (id: NotificationItem['id']) => void;
  onNavigate?: () => void;
};

const labels = {
  DISPUTE_OPENED: "A participant opened a dispute",
  DISPUTE_PAID: "A dispute was resolved and the reward was paid",
  DISPUTE_REJECTED: "Your dispute was rejected",
  DISPUTE_CLOSED: "Your dispute was closed because the escrow was refunded",
  JOINED: 'Someone joined your quest',
  SUBMITTED: 'New evidence is ready to review',
  APPROVED: 'Your submission was approved',
  REJECTED: 'Your submission was rejected',
  CANCELLED: 'Your quest was cancelled and refunded',
  EXPIRED_REFUND: 'Your expired quest was refunded',
  QUEST_EXPIRED: 'A quest you joined ended',
  DISPUTE_REFUND: 'Your quest was refunded after dispute resolution',
} satisfies Record<NotificationItem['kind'], string>;

export default function NotificationRows({ items, onRead, onNavigate }: NotificationRowsProps) {
  const { t, locale } = useLanguage();

  return (
    <ul className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/quests/${item.questId}${item.kind === "SUBMITTED" ? "/evidence" : ""}`}
            onClick={() => { if (!item.readAt) onRead(item.id); }}
            onNavigate={onNavigate}
            className="flex items-start gap-3 px-4 py-4 hover:bg-[var(--surface-2)] sm:px-5"
          >
            <Bell aria-hidden className={`mt-0.5 size-4 shrink-0 ${item.readAt ? 'text-[var(--muted)]' : 'text-[var(--accent-text)]'}`} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold">
                {!item.readAt && <span className="sr-only"><Translate text={"Unread."} />{' '}</span>}{t(labels[item.kind])}
              </p>
              <p className="wrap-anywhere text-sm text-[var(--muted)]">{item.questTitle}</p>
              <time dateTime={item.createdAt.toISOString()} className="text-xs text-[var(--muted)]">
                {item.createdAt.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </div>
            <ArrowUpRight aria-hidden className="size-4 shrink-0 text-[var(--muted)]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
