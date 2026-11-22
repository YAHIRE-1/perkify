'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { Translate, useLanguage } from '@/lib/i18n/provider';
import { orpc } from '@/utils/orpc';
import NotificationRows from './NotificationRows';

export default function NotificationBell({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const unreadOptions = orpc.notifications.unread.queryOptions();
  const { data: unread = 0 } = useQuery({
    ...unreadOptions,
    queryKey: [...unreadOptions.queryKey, userId],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const listOptions = orpc.notifications.list.queryOptions({ input: { page: 1 } });
  const recent = useQuery({
    ...listOptions,
    queryKey: [...listOptions.queryKey, userId],
    enabled: open,
    staleTime: 15_000,
  });
  const markRead = useMutation(orpc.notifications.markRead.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
  }));
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-preview"
        aria-label={unread ? t("Notifications, {count} unread", { count: unread }) : t("Notifications")}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="relative ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--lime)] px-1 text-center text-xs font-semibold text-[var(--on-lime)]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <dialog
        id="notification-preview"
        ref={dialog}
        aria-labelledby="notification-preview-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="surface fixed top-14 right-3 bottom-auto left-auto m-0 max-h-[calc(100dvh-4.25rem)] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto text-[var(--fg)] shadow-xl backdrop:bg-black/25 sm:right-5"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <h2 id="notification-preview-title" className="font-display text-lg font-semibold">
            <Translate text={"Notifications"} />
          </h2>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={close}
            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {recent.isError ? (
          <div className="space-y-3 px-4 py-6 text-sm">
            <p role="alert"><Translate text={"Could not load notifications"} /></p>
            <button className="btn" onClick={() => void recent.refetch()} type="button">
              <Translate text={"Try again"} />
            </button>
          </div>
        ) : !recent.data ? (
          <p role="status" className="px-4 py-6 text-sm text-[var(--muted)]">
            <Translate text={"Loading notifications…"} />
          </p>
        ) : recent.data.items.length ? (
          <NotificationRows
            items={recent.data.items.slice(0, 5)}
            onRead={(id) => markRead.mutate({ id })}
            onNavigate={close}
          />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            <Translate text={"Updates about your quests and submissions will appear here."} />
          </p>
        )}

        <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--surface)] p-3">
          <Link href="/notifications" onNavigate={close} className="btn w-full">
            <Translate text={"View all notifications"} />
          </Link>
        </div>
      </dialog>
    </>
  );
}
