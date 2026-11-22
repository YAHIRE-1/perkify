'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Languages } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import QuestAction, { ROAD_ID } from './QuestAction';
import QuestDescription from './QuestDescription';
import QuestEscrow from './QuestEscrow';
import QuestHeader from './QuestHeader';
import QuestMilestones from './QuestMilestones';
import QuestReward from './QuestReward';
import QuestRefundAction from './QuestRefundAction';
import QuestRoad from './QuestRoad';
import QuestRules from './QuestRules';

import { useGetQuest } from '@/hooks/quest/use-quest';
import { orpc } from '@/utils/orpc';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function QuestDetailSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <p className="sr-only"><Translate text={"Loading quest"} /></p>
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
  const { locale, t } = useLanguage();
  const [translatedQuest, setTranslatedQuest] = useState<string | null>(null);
  const { user, loading, login } = useAuth();
  const { data: quest, isLoading, error } = useGetQuest(id, !!user);
  const canTranslate = !!user && !!quest && quest.status !== 'DRAFT' && !quest.archived;
  const showTranslation = canTranslate && translatedQuest === id;
  const translationOptions = orpc.quests.translate.queryOptions({ input: { id, locale } });
  const translation = useQuery({
    ...translationOptions,
    queryKey: [...translationOptions.queryKey, user?.id, quest?.updatedAt],
    enabled: showTranslation,
    retry: false,
    staleTime: Infinity,
  });
  const back = (
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent-text)]">
      <ArrowLeft aria-hidden className="size-4" />{' '}<Translate text={"Back to quests"} /></Link>
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
            ><Translate text={"Connect wallet"} /></button>
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
  const cancellationSubmitted = quest.status === 'FUNDED' && quest.cancelExpiresAt !== null && !!quest.refundTxHash;
  const translated = showTranslation ? translation.data : undefined;
  const translatedMilestones = new Map(translated?.milestones.map(({ id, description }) => [id, description]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        {canTranslate && (
          <button
            type="button"
            className="btn inline-flex items-center gap-2"
            onClick={() => {
              if (showTranslation && translation.isError) {
                void translation.refetch();
              } else {
                setTranslatedQuest(showTranslation ? null : id);
              }
            }}
            disabled={showTranslation && translation.isFetching}
          >
            <Languages aria-hidden className="size-4" />
            {showTranslation && translation.isFetching ? t("Translating quest…")
              : showTranslation && translation.isError ? t("Retry translation")
              : translated ? t("Show original") : t("Translate quest")}
          </button>
        )}
      </div>
      {showTranslation && (translation.isError || translated) && (
        <p role="status" className="text-sm text-[var(--muted)]">
          {translation.isError
            ? t("Quest translation is currently unavailable.")
            : t("Machine-translated quest content")}
        </p>
      )}

      <QuestHeader
        title={translated?.title ?? quest.title}
        category={quest.category}
        status={quest.status === 'FUNDED' && quest.cancelExpiresAt !== null ? 'CANCELLING' : quest.status}
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
            {cancellationSubmitted ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                {t("Refund submitted. Waiting for final confirmation.")}
              </p>
            ) : (quest.canCancel || quest.canClaimLegacyRefund) && (
              <QuestRefundAction id={quest.id} emergency={quest.canClaimLegacyRefund} reserved={quest.cancelExpiresAt !== null} />
            )}
            {quest.escrowStatus === 'REFUNDED' && (
              <p className="text-sm font-semibold text-[var(--accent-text)]">{t("Refund confirmed.")}</p>
            )}
            {quest.isOwner && isDraft && (
              <Link href={`/quests/${quest.id}/edit`} className="btn btn-primary w-full"><Translate text={"Edit quest"} /></Link>
            )}
          </QuestReward>

          <QuestEscrow
            chainId={quest.chainId}
            escrowId={quest.escrowId}
            escrowStatus={quest.escrowStatus}
            createTxHash={quest.createTxHash}
          />

          <details className="surface space-y-3 p-5">
            <summary className="cursor-pointer font-display font-semibold"><Translate text={"Quest history"} /></summary>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]"><Translate text={"Created"} /></dt>
                <dd>{dateFormat.format(new Date(quest.createdAt))}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]"><Translate text={"Last updated"} /></dt>
                <dd>{dateFormat.format(new Date(quest.updatedAt))}</dd>
              </div>
            </dl>
          </details>
        </aside>

        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
          <article className="surface p-5 sm:p-7">
            <QuestDescription
              description={translated?.description ?? quest.description}
              deliverables={<QuestMilestones milestones={(quest.milestones ?? []).map((item) => ({
                ...item,
                description: translatedMilestones.get(item.id) ?? item.description,
              }))} />}
              criteria={translated?.criteria ?? quest.criteria}
              validationChecklist={translated?.checklist ?? quest.validationChecklist}
              proofRequired={quest.validationChecklist.map((item) => quest.checklistProofRequired?.includes(item) ?? false)}
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
              {quest.isOwner && quest.status === 'DISPUTED' ? (
                <div className="surface space-y-3 p-5">
                  <p className="text-sm text-muted-foreground">
                    <Translate text="This quest is on hold while a dispute is reviewed." />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/disputes" className="btn"><Translate text="View my disputes" /></Link>
                    <Link href={`/quests/${quest.id}/evidence`} className="btn"><Translate text="View evidence" /></Link>
                  </div>
                </div>
              ) : quest.isOwner ? (
                <section className="surface space-y-3 p-5">
                  <h2 className="font-display text-xl font-semibold"><Translate text="Quest evidence" /></h2>
                  <Link className="btn btn-primary" href={`/quests/${quest.id}/evidence`}>
                    <Translate text={quest.status === 'FUNDED' ? 'Review submissions' : 'View evidence'} />
                  </Link>
                </section>
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
