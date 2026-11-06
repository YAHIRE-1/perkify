'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConfig } from 'wagmi';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { useArchiveQuest, useGetQuest } from '@/hooks/quest/use-quest';
import { authClient } from '@/lib/auth-client';
import { formatReward } from '@/lib/format-reward';

const formatDate = (d) =>
  new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

const shortHash = (h) => `${h.slice(0, 10)}…${h.slice(-8)}`;

function Section({ title, children }) {
  return (
    <section className="min-w-0">
      <h2 className="font-display mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function QuestDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="surface h-72 animate-pulse p-6" />
      <div className="surface h-40 animate-pulse p-5" />
    </div>
  );
}

export default function QuestDetail({ id, backHref = '/dashboard' }) {
  const router = useRouter();
  const config = useConfig();
  const { data: session } = authClient.useSession();

  const { data: q, isLoading, error } = useGetQuest(id);
  const archive = useArchiveQuest();

  if (isLoading) return <QuestDetailSkeleton />;

  if (error || !q) {
    return <EmptyState title="Quest not found" hint={error?.message} />;
  }

  const isDraft = q.status === 'DRAFT';
  const isOwner = q.creatorId ?? (!!session?.user.id && session.user.id === q.creatorId);
  const busy = archive.isPending;

  const reward = formatReward(q.rewardAmount, 6);
  const symbol = q.token?.symbol ?? '???';

  const isExpired = new Date(q.deadline).getTime() < Date.now();
  const hasEscrow = q.escrowStatus && q.escrowStatus !== 'NONE';

  const explorer = config.chains.find((c) => c.id === q.chainId)?.blockExplorers
    ?.default.url;

  const timeline = [
    { label: 'Created', date: q.createdAt },
    { label: 'Deadline', date: q.deadline, expired: isExpired },
    { label: 'Claimed', date: q.claimedAt },
    { label: 'Claim deadline', date: q.claimDeadline },
    { label: 'Submitted', date: q.submittedAt },
    { label: 'Review deadline', date: q.reviewDeadline },
  ].filter((r) => r.date);

  const cancel = () => {
    if (busy || !window.confirm('Cancel this quest?')) return;
    archive.mutate(
      { id: q.id, title: q.title, archived: q.archived },
      { onSuccess: () => router.push(backHref) },
    );
  };

  return (
    <div className="space-y-4">
      <Link href={backHref} className="muted inline-block text-sm hover:underline">
        ← Back to quests
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main content */}
        <article className="surface min-w-0 space-y-6 p-4 sm:p-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {q.isBoosted && (
              <span className="chip chip-boost whitespace-nowrap">Boosted · $PRKY</span>
            )}
            {q.category && (
              <span className="chip max-w-[12rem] truncate">{q.category}</span>
            )}
            <span className="ml-auto shrink-0">
              <StatusBadge status={q.status} />
            </span>
          </div>

          <h1 className="font-display break-words text-2xl font-bold sm:text-3xl">
            {q.title}
          </h1>

          {isDraft && isOwner && (
            <p className="surface-2 px-3 py-2 text-sm" role="note">
              This quest is a draft. It is only visible to you until it is funded.
            </p>
          )}

          <p className="muted whitespace-pre-wrap break-words leading-relaxed">
            {q.description}
          </p>

          {q.criteria && (
            <Section title="Acceptance criteria">
              <p className="muted whitespace-pre-wrap break-words text-sm leading-relaxed">
                {q.criteria}
              </p>
            </Section>
          )}

          {!!q.validationChecklist?.length && (
            <Section title="Validation checklist">
              <ul className="space-y-2">
                {q.validationChecklist.map((c, i) => (
                  <li key={`${i}-${c}`} className="surface-2 flex gap-2 px-3 py-2 text-sm">
                    <span className="shrink-0" style={{ color: 'var(--cyan-text)' }}>
                      ✓
                    </span>
                    <span className="min-w-0 break-words">{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </article>

        {/* Sidebar: first on mobile, sticky on desktop */}
        <aside className="order-first min-w-0 space-y-4 lg:order-none lg:sticky lg:top-6 lg:self-start">
          <div className="surface space-y-4 p-4 sm:p-5">
            <div>
              <div className="muted-2 text-xs tracking-wider">REWARD</div>
              <div
                className="font-display flex min-w-0 items-baseline gap-2 text-3xl font-bold sm:text-4xl"
                style={{ color: 'var(--accent-text)' }}
                title={`${reward.full} ${symbol}`}
              >
                <span className="truncate">{reward.text}</span>
                <span className="max-w-[8rem] shrink-0 truncate text-lg sm:text-xl">
                  {symbol}
                </span>
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              {timeline.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-3">
                  <dt className="muted shrink-0">{r.label}</dt>
                  <dd className={`min-w-0 text-right ${r.expired ? 'opacity-60' : ''}`}>
                    {formatDate(r.date)}
                    {r.expired && ' (expired)'}
                  </dd>
                </div>
              ))}
            </dl>

            {isOwner && isDraft && (
              <div className="flex gap-2">
                <Link
                  href={`/quests/${q.id}/edit`}
                  className="btn flex-1 text-center"
                  aria-disabled={busy}
                >
                  Edit
                </Link>
                <button className="btn flex-1" onClick={cancel} disabled={busy}>
                  {busy ? 'Canceling…' : 'Cancel'}
                </button>
              </div>
            )}
          </div>

          {hasEscrow && (
            <div className="surface space-y-2 p-4 text-sm sm:p-5">
              <div className="muted-2 text-xs tracking-wider">ESCROW</div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="muted">Status</span>
                <span className="font-medium">{q.escrowStatus}</span>
              </div>
              {q.createTxHash && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="muted">Deposit tx</span>
                  {explorer ? (
                    <a
                      href={`${explorer}/tx/${q.createTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-xs underline"
                      title={q.createTxHash}
                    >
                      {shortHash(q.createTxHash)}
                    </a>
                  ) : (
                    <span className="truncate font-mono text-xs" title={q.createTxHash}>
                      {shortHash(q.createTxHash)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}