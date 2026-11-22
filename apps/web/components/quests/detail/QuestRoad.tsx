'use client';
import Link from 'next/link';
import { QuestDisputeAction } from './QuestDisputeAction';
import { Translate } from '@/lib/i18n/provider';

import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@perkify/ui/components/button';
import { formatHours } from '@perkify/db/validations/quest';
import { authClient } from '@/lib/auth-client';
import { formatReward } from '@/lib/format-reward';
import {
  CLAIM_LABEL,
  useClaimReward,
  useJoinQuest,
  useQuestEvidence,
  type QuestDetail,
} from '@/hooks/participations/use-participation';

const STEPS = ['Join', 'Submit evidence', 'Creator review', 'Claim reward'];

function currentStep(status?: string) {
  switch (status) {
    case 'JOINED':
      return 1;
    case 'SUBMITTED':
    case 'REJECTED':
      return 2;
    case 'APPROVED':
      return 3;
    case 'PAID':
      return STEPS.length; // todo completado
    default:
      return 0;
  }
}

function timeLeft(date: Date | string) {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/* -------------------------------------------------------------------------- */
/*  Camino                                                                    */
/* -------------------------------------------------------------------------- */

function Steps({ index, failed }: { index: number; failed: boolean }) {
  return (
    <ol className="grid grid-cols-2 items-start gap-3 sm:grid-cols-4">
      {STEPS.map((label, i) => {
        const done = i < index;
        const current = i === index;
        const bad = current && failed;
        const circle = bad
          ? 'bg-destructive text-white'
          : done
            ? 'bg-primary text-primary-foreground'
            : current
              ? 'border-2 border-primary'
              : 'bg-muted text-muted-foreground';
        return (
          <li key={label} aria-current={current ? 'step' : undefined} className="flex flex-col items-center gap-1 text-center text-xs">
            <span className={`flex size-7 items-center justify-center rounded-full ${circle}`}>
              {bad ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={current || done ? 'font-medium' : 'text-muted-foreground'}><Translate text={label} /></span>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formulario de evidencia                                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Quest road                                                                */
/* -------------------------------------------------------------------------- */

export default function QuestRoad({ quest }: { quest: QuestDetail }) {
  const { data: session } = authClient.useSession();
  const join = useJoinQuest();
  const claim = useClaimReward();

  const p = quest.myParticipation;
  const evidence = useQuestEvidence(quest.id, !!p, quest.status === "FUNDED");

  // justo después de calcular `p`, `evidence`, etc.
  console.log('[claim] QuestRoad render', {
    questId: quest.id,
    isOwner: quest.isOwner,
    participationStatus: p?.status,
    payoutTxHash: p?.payoutTxHash,
    claimStep: claim.step,
    claimPending: claim.isPending,
    claimError: claim.error,
  });

  if (quest.isOwner) return null; // el creador revisa desde su propio panel

  const now = new Date();
  const hasSpot = quest.maxParticipants === 0 || quest.taken < quest.maxParticipants;
  const open = quest.status === 'FUNDED' && quest.cancelExpiresAt === null && new Date(quest.deadline) > now && hasSpot;
  const expired = p?.status === 'JOINED' && new Date(p.expiresAt) <= now;
  const canSubmit = p?.status === 'JOINED' && !expired && quest.status === 'FUNDED'
    && quest.cancelExpiresAt === null && new Date(quest.deadline) > now;
  const canRetry = !!p && p.attempts < quest.maxAttempts;

  const subs = evidence.data?.[0]?.submissions ?? [];
  const last = [...subs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];

  const reward = formatReward(quest.rewardAmount, 6);

  const joinButton = (label: string) => (
    <Button
      disabled={join.isPending || !session}
      onClick={() => join.mutate({ id: quest.id })}
      variant="legacy-primary"
    >
      {join.isPending ? <Loader2 className="animate-spin" /> : null}
      <Translate text={label} />
    </Button>
  );

  let panel: React.ReactNode;

  if (quest.status === 'DISPUTED') {
    panel = (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground"><Translate text="This quest is on hold while a dispute is reviewed." /></p>
        {p && <Link href="/disputes" className="btn"><Translate text="View my disputes" /></Link>}
      </div>
    );
  } else if (!p) {
    panel = open ? (
      <>
        <p className="text-sm text-muted-foreground"><Translate text={"After joining, you have up to"} />{' '}{formatHours(quest.submitWindowHours)}{' '}<Translate text={"to submit evidence. Submit before the quest closes."} /></p>
        {joinButton('Join quest')}
      </>
    ) : (
      <p className="text-sm text-muted-foreground">
        {hasSpot ? 'This quest is not accepting participants.' : 'No spots left.'}
      </p>
    );
  } else if (p.status === 'JOINED') {
    panel = expired ? (
      <>
        <p className="text-sm text-muted-foreground"><Translate text={"Your time to submit evidence ran out."} /></p>
        {open && canRetry ? (
          joinButton('Rejoin')
        ) : (
          <p className="text-sm text-destructive"><Translate text={"No attempts left."} /></p>
        )}
      </>
    ) : (
      <>
        {last?.status === 'REJECTED' && (
          <p className="text-sm text-destructive" role="alert"><Translate text={"Your last submission was rejected:"} />{' '}{last.rejectionReason}
          </p>
        )}
        <p className="text-sm text-muted-foreground"><Translate text={"Attempt"} />{' '}{p.attempts}/{quest.maxAttempts} · {timeLeft(p.expiresAt)}{' '}<Translate text={"left to submit."} /></p>
        {canSubmit && (
          <Link className="btn btn-primary" href={`/quests/${quest.id}/evidence`}>
            <Translate text="Submit evidence" />
          </Link>
        )}
      </>
    );
  } else if (p.status === 'SUBMITTED') {
    const left = last ? timeLeft(last.reviewDeadline) : null;
    panel = (
      <p className="text-sm text-muted-foreground"><Translate text={"Your evidence is with the creator."} />{' '}
        {left
          ? `They have ${left} left to review it.`
          : 'The review window has passed. If the creator stays silent, the platform arbiter can resolve it.'}
      </p>
    );
  } else if (p.status === 'REJECTED') {
    panel = (
      <p className="text-sm text-destructive" role="alert"><Translate text={"Your submission was rejected"} />{last?.rejectionReason ? `: ${last.rejectionReason}` : '.'}{' '}<Translate text={"You have no attempts left."} /></p>
    );
  } else if (p.status === 'APPROVED') {
    panel = (
      <>
        <p className="text-sm"><Translate text={"Approved! Reward:"} />{' '}{reward.text} {quest.token.symbol}
        </p>
        <Button
          disabled={claim.isPending}
          onClick={() => {
            console.log('[claim] click en Claim reward', { questId: quest.id });
            claim.mutate(quest.id);
          }}
          variant="legacy-primary"
        >
          {claim.isPending ? <Loader2 className="animate-spin" /> : null}
          {CLAIM_LABEL[claim.step]}
        </Button>
        {claim.isError && (
          <p className="text-xs text-muted-foreground"><Translate text={"You can retry: nothing is charged twice."} /></p>
        )}
      </>
    );
  } else if (p.status === 'PAID') {
    panel = (
      <p className="text-sm"><Translate text={"Reward paid"} />{p.payoutTxHash ? ` · tx ${p.payoutTxHash.slice(0, 10)}…` : ''}.
      </p>
    );
  } else {
    panel = null;
  }

  return (
    <section className="surface space-y-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">
        {p ? <Translate text={"Your participation"} /> : <Translate text={"How to participate"} />}
      </h2>
      <Steps failed={p?.status === 'REJECTED'} index={currentStep(p?.status)} />
      <div className="space-y-3">
        {panel}
        {p && !canSubmit && (
          <Link className="btn" href={`/quests/${quest.id}/evidence`}><Translate text="View evidence" /></Link>
        )}
        {quest.canOpenDispute && <QuestDisputeAction questId={quest.id} />}
      </div>
    </section>
  );
}
