'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import QuestReviewPanel from '../QuestReviewPanel';
import QuestAction, { ROAD_ID } from './QuestAction';
import QuestDescription from './QuestDescription';
import QuestEscrow from './QuestEscrow';
import QuestHeader from './QuestHeader';
import QuestMilestones from './QuestMilestones';
import QuestReward from './QuestReward';
import QuestRoad from './QuestRoad';
import QuestRules from './QuestRules';

import { useGetQuest } from '@/hooks/quest/use-quest';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function QuestDetailSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <p className="sr-only">Loading quest</p>
      <div aria-hidden className="surface h-36 motion-safe:animate-pulse" />
      <div aria-hidden className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="surface h-72 motion-safe:animate-pulse" />
        <div className="surface h-52 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

type Props = {
  id: string;
  backHref?: string;
};

export default function QuestDetail({ id, backHref = '/dashboard' }: Props) {
  const { user, loading, login } = useAuth();
  const { data: quest, isLoading, error } = useGetQuest(id, !!user);
  const back = (
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent-text)]">
      <ArrowLeft aria-hidden className="size-4" /> Back to quests
    </Link>
  );

  if (loading || isLoading) {
    return <div className="space-y-5">{back}<QuestDetailSkeleton /></div>;
  }

  if (!user) {
    return (
      <div className="space-y-5">
        {back}
        <EmptyState
          title="Connect your wallet to view this quest"
          hint="Sign in to see the deliverables and how to participate."
          action={
            <button
              className="btn btn-primary"
              onClick={() => login().catch((reason: unknown) => {
                toast.error(reason instanceof Error ? reason.message : 'Could not connect your wallet.');
              })}
              type="button"
            >
              Connect wallet
            </button>
          }
        />
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="space-y-5">
        {back}
        <EmptyState title="Quest not found" hint={error?.message} />
      </div>
    );
  }

  const isDraft = quest.status === 'DRAFT';

  return (
    <div className="space-y-5">
      {back}

      <QuestHeader
        title={quest.title}
        category={quest.category}
        status={quest.status}
        isBoosted={quest.isBoosted}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside aria-label="Reward and quest actions" className="min-w-0 space-y-3 lg:sticky lg:top-16 lg:col-start-2 lg:row-start-1">
          <QuestReward
            rewardAmount={quest.rewardAmount}
            tokenSymbol={quest.token.symbol}
            deadline={quest.deadline}
          >
            <QuestAction quest={quest} />
            {quest.isOwner && isDraft && (
              <Link href={`/quests/${quest.id}/edit`} className="btn btn-primary w-full">
                Edit quest
              </Link>
            )}
          </QuestReward>

          <QuestEscrow
            chainId={quest.chainId}
            escrowId={quest.escrowId}
            escrowStatus={quest.escrowStatus}
            createTxHash={quest.createTxHash}
          />

          <details className="surface space-y-3 p-5">
            <summary className="cursor-pointer font-display font-semibold">Quest history</summary>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Created</dt>
                <dd>{dateFormat.format(new Date(quest.createdAt))}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Last updated</dt>
                <dd>{dateFormat.format(new Date(quest.updatedAt))}</dd>
              </div>
            </dl>
          </details>
        </aside>

        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
          <article className="surface p-5 sm:p-7">
            <QuestDescription
              description={quest.description}
              deliverables={<QuestMilestones milestones={quest.milestones ?? []} />}
              criteria={quest.criteria}
              validationChecklist={quest.validationChecklist}
            />
          </article>

          <QuestRules
            maxParticipants={quest.maxParticipants}
            submitWindowHours={quest.submitWindowHours}
            reviewWindowHours={quest.reviewWindowHours}
            maxAttempts={quest.maxAttempts}
          />

          {!isDraft && (
            <div id={ROAD_ID} className="scroll-mt-20" tabIndex={-1}>
              {quest.isOwner ? (
                <QuestReviewPanel questId={quest.id} maxAttempts={quest.maxAttempts} />
              ) : (
                <QuestRoad quest={quest} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
