'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/Providers';
import EvidenceForm from '@/components/quests/EvidenceForm';
import QuestReviewPanel from '@/components/quests/QuestReviewPanel';
import { useGetQuest } from '@/hooks/quest/use-quest';
import { Translate } from '@/lib/i18n/provider';

export default function QuestEvidencePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const detail = useGetQuest(id, !!user);
  const quest = detail.data;
  const participation = quest?.myParticipation;
  const hasRequirements = Boolean(quest?.milestones.length || quest?.criteria);
  const canRead = user && quest && quest.status !== 'DRAFT' && (quest.isOwner || participation);
  const funded = quest?.status === 'FUNDED';
  const now = Date.now();
  const canSubmit = funded && quest.cancelExpiresAt === null && participation?.status === 'JOINED'
    && +new Date(quest.deadline) > now && +new Date(participation.expiresAt) > now;

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <Link className="btn" href={`/quests/${id}`}>
        <ArrowLeft aria-hidden className="size-4" /><Translate text="Back to quest" />
      </Link>
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl"><Translate text="Quest evidence" /></h1>
        {canRead && <p className="mt-2 break-words text-muted-foreground">{quest.title}</p>}
      </header>
      {loading || (user && detail.isPending) ? (
        <p role="status"><Translate text="Loading evidence…" /></p>
      ) : detail.isError ? (
        <p className="surface p-5" role="alert"><Translate text="Could not load the quest." /></p>
      ) : !canRead ? (
        <p className="surface p-5" role="status">
          <Translate text={user ? 'Evidence is available to the creator and participants.' : 'Connect your wallet to view evidence.'} />
        </p>
      ) : (
        <div className={hasRequirements ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : 'mx-auto max-w-4xl'}>
          {hasRequirements && (
            <aside className="surface space-y-4 p-5">
              <h2 className="font-display text-lg font-semibold"><Translate text="Quest requirements" /></h2>
              {quest.milestones.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold"><Translate text="Deliverables" /></h3>
                  <ol className="list-decimal space-y-1 break-words pl-5 text-sm">
                    {quest.milestones.map((milestone) => <li key={milestone.id}>{milestone.description}</li>)}
                  </ol>
                </section>
              )}
              {quest.criteria && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold"><Translate text="Acceptance criteria" /></h3>
                  <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{quest.criteria}</p>
                </section>
              )}
            </aside>
          )}
          <div className="min-w-0 space-y-5">
            {canSubmit && (
              <EvidenceForm questId={id} items={quest.validationChecklist} proofRequired={quest.checklistProofRequired ?? []} />
            )}
            <QuestReviewPanel questId={id} canReview={funded && quest.isOwner} pollForSubmissions={funded} />
          </div>
        </div>
      )}
    </main>
  );
}
