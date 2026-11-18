'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/provider';
import { orpc } from '@/utils/orpc';

export default function NotificationLink({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const options = orpc.notifications.unread.queryOptions();
  const { data: unread = 0 } = useQuery({
    ...options,
    queryKey: [...options.queryKey, userId],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <Link
      href="/notifications"
      aria-label={unread ? t("Notifications, {count} unread", { count: unread }) : t("Notifications")}
      className="relative ml-auto inline-flex size-9 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
    >
      <Bell aria-hidden className="size-5" />
      {unread > 0 && (
        <span aria-hidden className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--lime)] px-1 text-center text-xs font-semibold text-[var(--on-lime)]">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
