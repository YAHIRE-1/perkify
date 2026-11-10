'use client';
import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@perkify/ui/components/button';
import { Textarea } from '@perkify/ui/components/textarea';
import { authClient } from '@/lib/auth-client';
import { formatReward } from '@/lib/format-reward';
import {
  CLAIM_LABEL,
  useClaimReward,
  useJoinQuest,
  useMyEvidence,
  useSubmitEvidence,
  type QuestDetail,
} from '@/hooks/participations/use-participation';

const MAX_FILES = 5; // ajusta a MAX_FILES de api/lib/evidence.ts
const MAX_LINKS = 10;

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

const isUrl = (s: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

const formatSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

/* -------------------------------------------------------------------------- */
/*  Camino                                                                    */
/* -------------------------------------------------------------------------- */

function Steps({ index, failed }: { index: number; failed: boolean }) {
  return (
    <ol className="flex items-start gap-2">
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
          <li key={label} className="flex flex-1 flex-col items-center gap-1 text-center text-xs">
            <span className={`flex size-7 items-center justify-center rounded-full ${circle}`}>
              {bad ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={current || done ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formulario de evidencia                                                   */
/* -------------------------------------------------------------------------- */

function EvidenceForm({ questId }: { questId: string }) {
  const submit = useSubmitEvidence();
  const [notes, setNotes] = useState('');
  const [linksText, setLinksText] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const links = linksText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const badLink = links.find((l) => !isUrl(l));

  const problem =
    notes.trim().length < 10
      ? 'Describe what you did (at least 10 characters).'
      : !links.length && !files.length
        ? 'Add at least one link or file.'
        : badLink
          ? `Not a valid URL: ${badLink}`
          : links.length > MAX_LINKS
            ? `At most ${MAX_LINKS} links.`
            : null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) return;
        submit.mutate({ questId, notes: notes.trim(), links, files });
      }}
    >
      <div>
        <label className="text-sm font-medium" htmlFor="notes">
          What did you do?
        </label>
        <Textarea
          className="min-h-24"
          id="notes"
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          value={notes}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="links">
          Links (one per line)
        </label>
        <Textarea
          className="min-h-16"
          id="links"
          onChange={(e) => setLinksText(e.target.value)}
          placeholder="https://x.com/…"
          value={linksText}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="files">
          Files ({files.length}/{MAX_FILES})
        </label>
        <input
          className="block w-full text-sm"
          disabled={files.length >= MAX_FILES}
          id="files"
          multiple
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
            e.target.value = '';
          }}
          type="file"
        />
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${i}-${f.name}`}
              className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="truncate">
                {f.name} · {formatSize(f.size)}
              </span>
              <Button
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                type="button"
                variant="legacy-link"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {problem && <p className="text-xs text-muted-foreground">{problem}</p>}

      <Button disabled={!!problem || submit.isPending} type="submit" variant="legacy-primary">
        {submit.isPending ? <Loader2 className="animate-spin" /> : null}
        {submit.isPending ? 'Uploading…' : 'Submit evidence'}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quest road                                                                */
/* -------------------------------------------------------------------------- */

export default function QuestRoad({ quest }: { quest: QuestDetail }) {
  const { data: session } = authClient.useSession();
  const join = useJoinQuest();
  const claim = useClaimReward();

  const p = quest.myParticipation;
  const evidence = useMyEvidence(quest.id, !!p);

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
  const open = quest.status === 'FUNDED' && new Date(quest.deadline) > now && hasSpot;
  const expired = p?.status === 'JOINED' && new Date(p.expiresAt) <= now;
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
      {label}
    </Button>
  );

  let panel: React.ReactNode;

  if (!p) {
    panel = open ? (
      <>
        <p className="text-sm text-muted-foreground">
          Join to start. You will have {quest.submitWindowHours}h to submit your evidence.
        </p>
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
        <p className="text-sm text-muted-foreground">Your time to submit evidence ran out.</p>
        {open && canRetry ? (
          joinButton('Rejoin')
        ) : (
          <p className="text-sm text-destructive">No attempts left.</p>
        )}
      </>
    ) : (
      <>
        {last?.status === 'REJECTED' && (
          <p className="text-sm text-destructive" role="alert">
            Your last submission was rejected: {last.rejectionReason}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Attempt {p.attempts}/{quest.maxAttempts} · {timeLeft(p.expiresAt)} left to submit.
        </p>
        <EvidenceForm questId={quest.id} />
      </>
    );
  } else if (p.status === 'SUBMITTED') {
    const left = last ? timeLeft(last.reviewDeadline) : null;
    panel = (
      <p className="text-sm text-muted-foreground">
        Your evidence is with the creator.{' '}
        {left
          ? `They have ${left} left to review it.`
          : 'The review window has passed. If the creator stays silent, the platform arbiter can resolve it.'}
      </p>
    );
  } else if (p.status === 'REJECTED') {
    panel = (
      <p className="text-sm text-destructive" role="alert">
        Your submission was rejected{last?.rejectionReason ? `: ${last.rejectionReason}` : '.'} You have no
        attempts left.
      </p>
    );
  } else if (p.status === 'APPROVED') {
    panel = (
      <>
        <p className="text-sm">
          Approved! Reward: {reward.text} {quest.token.symbol}
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
          <p className="text-xs text-muted-foreground">You can retry: nothing is charged twice.</p>
        )}
      </>
    );
  } else if (p.status === 'PAID') {
    panel = (
      <p className="text-sm">
        Reward paid{p.payoutTxHash ? ` · tx ${p.payoutTxHash.slice(0, 10)}…` : ''}.
      </p>
    );
  } else {
    panel = null;
  }

  return (
    <section className="surface space-y-4 p-6">
      <Steps failed={p?.status === 'REJECTED'} index={currentStep(p?.status)} />
      <div className="space-y-3">{panel}</div>
    </section>
  );
}
