'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@perkify/ui/components/button';
import { Textarea } from '@perkify/ui/components/textarea';
import {
  useQuestSubmissions,
  useReviewSubmission,
  type QuestEvidence,
} from '@/hooks/participations/use-participation';

type Submission = QuestEvidence[number]['submissions'][number];

function timeLeft(date: Date | string) {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

const formatSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

function ReviewItem({
  hunterName,
  attempt,
  maxAttempts,
  submission: s,
}: {
  hunterName: string;
  attempt: number;
  maxAttempts: number;
  submission: Submission;
}) {
  const review = useReviewSubmission();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const left = timeLeft(s.reviewDeadline);
  const reasonOk = reason.trim().length >= 5; // mismo mínimo que el zod del servidor

  return (
    <li className="surface-2 space-y-3 p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{hunterName}</span>
        <span className="muted text-xs">
          Attempt {attempt}/{maxAttempts} · {left ? `${left} left to review` : 'review window passed'}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm">{s.notes}</p>

      {s.links.length > 0 && (
        <ul className="space-y-1 text-sm">
          {s.links.map((l) => (
            <li key={l} className="truncate">
              <a className="underline" href={l} rel="noopener noreferrer nofollow" target="_blank">
                {l}
              </a>
            </li>
          ))}
        </ul>
      )}

      {s.files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {s.files.map((f) => (
            <li key={f.id} className="truncate">
              <a className="underline" href={f.url} rel="noopener noreferrer" target="_blank">
                {f.name}
              </a>{' '}
              <span className="muted text-xs">· {formatSize(f.size)}</span>
            </li>
          ))}
        </ul>
      )}

      {rejecting ? (
        <div className="space-y-2">
          <Textarea
            className="min-h-16"
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell the hunter what to fix (min. 5 characters)"
            value={reason}
          />
          <div className="flex gap-2">
            <Button
              disabled={!reasonOk || review.isPending}
              onClick={() =>
                review.mutate({ submissionId: s.id, decision: 'REJECT', reason: reason.trim() })
              }
              variant="legacy-primary"
            >
              {review.isPending ? <Loader2 className="animate-spin" /> : null}
              Confirm rejection
            </Button>
            <Button onClick={() => setRejecting(false)} type="button" variant="legacy-link">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            disabled={review.isPending}
            onClick={() => review.mutate({ submissionId: s.id, decision: 'APPROVE' })}
            variant="legacy-primary"
          >
            {review.isPending ? <Loader2 className="animate-spin" /> : null}
            Approve
          </Button>
          <Button disabled={review.isPending} onClick={() => setRejecting(true)} variant="legacy-link">
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

export default function QuestReviewPanel({
  questId,
  maxAttempts,
}: {
  questId: string;
  maxAttempts: number;
}) {
  const { data, isLoading } = useQuestSubmissions(questId, true);

  // submission PENDING = esperando revisión del creador
  const pending = (data ?? []).flatMap((p) =>
    p.submissions
      .filter((s) => s.status === 'PENDING')
      .map((s) => ({ p, s })),
  );

  return (
    <section className="surface space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">Review submissions</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
            {pending.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : pending.length === 0 ? (
        <p className="muted text-sm">Nothing to review yet.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map(({ p, s }) => (
            <ReviewItem
              key={s.id}
              attempt={p.attempts}
              hunterName={p.hunter.name}
              maxAttempts={maxAttempts}
              submission={s}
            />
          ))}
        </ul>
      )}
    </section>
  );
}