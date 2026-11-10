'use client';

import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import QuestRoad from '@/components/quests/detail/QuestRoad';
import QuestAction, { ROAD_ID } from './QuestAction';
import QuestHeader from './QuestHeader';
import QuestDescription from './QuestDescription';
import QuestMilestones from './QuestMilestones';
import QuestRules from './QuestRules';
import QuestReward from './QuestReward';
import QuestEscrow from './QuestEscrow';
import QuestReviewPanel from '../QuestReviewPanel';

import { useGetQuest } from '@/hooks/quest/use-quest';
import { authClient } from '@/lib/auth-client';

const toISO = (d: string | Date) => new Date(d).toISOString();

function QuestDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="space-y-6">
        <div className="surface h-48 animate-pulse" />
        <div className="surface h-64 animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="surface h-48 animate-pulse" />
        <div className="surface h-40 animate-pulse" />
      </div>
    </div>
  );
}

type Props = {
  id: string;
  backHref?: string;
};

export default function QuestDetail({ id, backHref = '/dashboard' }: Props) {
  const { data: session } = authClient.useSession();
  const { data: quest, isLoading, error } = useGetQuest(id);

  if (isLoading) return <QuestDetailSkeleton />;

  // Los borradores ajenos ya responden NOT_FOUND desde el servidor
  if (error || !quest) {
    return <EmptyState title="Quest not found" hint={error?.message} />;
  }

  const isDraft = quest.status === 'DRAFT';

  return (
    <div className="space-y-6">
      <Link href={backHref} className="muted inline-block text-sm hover:underline">
        ← Back to quests
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* MAIN */}
        <main className="min-w-0 space-y-6">
          <article className="surface min-w-0 space-y-6 p-4 sm:p-6">
            <QuestHeader
              title={quest.title}
              category={quest.category}
              status={quest.status}
              isBoosted={quest.isBoosted}
            />

            <div className="border-t" />

            <QuestDescription
              description={quest.description}
              criteria={quest.criteria}
              validationChecklist={quest.validationChecklist}
            />

            <div className="border-t" />

            <QuestMilestones milestones={quest.milestones ?? []} />
          </article>

          <QuestRules
            maxParticipants={quest.maxParticipants}
            submitWindowHours={quest.submitWindowHours}
            reviewWindowHours={quest.reviewWindowHours}
            maxAttempts={quest.maxAttempts}
          />

          {/* Camino del participante: se oculta solo si eres el creador */}
          <div id={ROAD_ID} className="scroll-mt-6">
            {quest.isOwner ? (
              !isDraft && (
                <QuestReviewPanel questId={quest.id} maxAttempts={quest.maxAttempts} />
              )
            ) : (
              <QuestRoad quest={quest} />
            )}
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="order-first min-w-0 space-y-4 lg:order-0 lg:sticky lg:top-6 lg:self-start">
          <QuestReward
            rewardAmount={quest.rewardAmount}
            tokenSymbol={quest.token.symbol}
            deadline={toISO(quest.deadline)}
            createdAt={toISO(quest.createdAt)}
            updatedAt={toISO(quest.updatedAt)}
          />

          {/* PARTICIPANT ACTION */}
          <QuestAction quest={quest} signedIn={!!session} />

          <QuestEscrow
            chainId={quest.chainId}
            escrowId={quest.escrowId}
            escrowStatus={quest.escrowStatus}
            createTxHash={quest.createTxHash}
          />

          {/* CREATOR ACTIONS */}
          {quest.isOwner && isDraft && (
            <div className="surface space-y-3 p-4">
              <h2 className="font-display font-semibold">Manage quest</h2>

              <Link
                href={`/quests/${quest.id}/edit`}
                className="btn block w-full text-center"
              >
                Edit quest
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}