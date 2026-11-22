'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import NotificationRows from '@/components/notifications/NotificationRows';
import { orpc } from '@/utils/orpc';

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
};

export default function NotificationsPage() {
  const { user, loading, login } = useAuth();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl"><Translate text={"Notifications"} /></h1>
        {user && (
          <Link href="/profile#email-notifications" className="btn">
            <Settings2 aria-hidden className="size-4" />{' '}<Translate text={"Email preferences"} /></Link>
        )}
      </header>
      {loading ? <div role="status" className="surface p-5"><Translate text={"Loading notifications…"} /></div>
        : user ? <Inbox key={user.id} userId={user.id} />
        : <EmptyState title="Connect your wallet to view notifications" action={
          <button className="btn btn-primary" type="button" onClick={() => login().catch((error: unknown) =>
            toast.error(error instanceof Error ? error.message : 'Could not connect your wallet.'))}><Translate text={"Connect wallet"} /></button>
        } />}
    </div>
  );
}

function Inbox({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const options = orpc.notifications.list.queryOptions({ input: { page } });
  const inbox = useQuery({
    ...options,
    queryKey: [...options.queryKey, userId],
    refetchInterval: 30_000,
  });
  const markRead = useMutation(orpc.notifications.markRead.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
  }));

  if (inbox.isError) {
    return <EmptyState title="Could not load notifications" action={
      <button className="btn" onClick={() => void inbox.refetch()} type="button"><Translate text={"Try again"} /></button>
    } />;
  }
  if (!inbox.data) return <div role="status" className="surface p-5"><Translate text={"Loading notifications…"} /></div>;
  const { items, hasMore } = inbox.data;

  return (
    <>
      <section aria-label="Inbox" className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <h2 className="font-display text-lg font-semibold"><Translate text={"Inbox"} /></h2>
          <button type="button" className="btn" disabled={!items.length || markRead.isPending} onClick={() => markRead.mutate({})}><Translate text={"Mark all as read"} /></button>
        </div>
        {items.length ? (
          <NotificationRows items={items} onRead={(id) => markRead.mutate({ id })} />
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[var(--muted)]">
            {page === 1 ? t("Updates about your quests and submissions will appear here.") : t("No notifications on this page.")}
          </div>
        )}
      </section>
      {markRead.isError && <p role="alert" className="text-sm text-destructive"><Translate text={"Could not update notifications. Try again."} /></p>}
      {(page > 1 || hasMore) && (
        <nav aria-label="Inbox pages" className="flex items-center justify-between gap-3">
          <button className="btn" type="button" disabled={page === 1} onClick={() => setPage(page - 1)}><Translate text={"Previous"} /></button>
          <span className="text-sm text-[var(--muted)]"><Translate text={"Page"} />{' '}{page}</span>
          <button className="btn" type="button" disabled={!hasMore || page === 10_000} onClick={() => setPage(page + 1)}><Translate text={"Next"} /></button>
        </nav>
      )}
    </>
  );
}
