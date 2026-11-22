'use client';
import EvidenceAttachments from './EvidenceAttachments';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@perkify/ui/components/button';
import { Textarea } from '@perkify/ui/components/textarea';
import {
  useQuestEvidence,
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

function ReviewItem({
  hunterName,
  submission: s,
  canReview,
}: {
  hunterName: string;
  submission: Submission;
  canReview: boolean;
}) {
  const review = useReviewSubmission();
  const { locale, t } = useLanguage();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const left = timeLeft(s.reviewDeadline);
  const actionable = canReview && s.status === "PENDING";
  const status = s.status === "PENDING" ? "Pending review" : s.status === "APPROVED" ? "Approved" : "Rejected";
  const reasonOk = reason.trim().length >= 5; // mismo mínimo que el zod del servidor

  return (
    <li className="surface-2 space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 text-sm">
        <div>
          <p className="font-semibold">{hunterName}</p>
          <time className="text-xs text-muted-foreground" dateTime={new Date(s.createdAt).toISOString()}>
            {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.createdAt))}
          </time>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs font-medium"><Translate text={status} /></span>
      </div>

      {actionable && (
        <p className="text-xs text-muted-foreground">
          {left ? t('{time} left to review', { time: left }) : t('Review window passed')}
        </p>
      )}
      {s.notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold"><Translate text="Submission notes" /></h3>
          <p className="whitespace-pre-wrap break-words text-sm">{s.notes}</p>
        </div>
      )}
      {s.checklistResponses?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold"><Translate text="Delivered checklist items" /></h3>
          <ul className="space-y-2">
            {s.checklistResponses.map(({ item, proof }) => {
              const file = proof?.kind === 'file' ? s.files.find((entry) => entry.id === proof.fileId) : undefined;
              const url = proof?.kind === 'link' ? proof.url : file?.url;
              return (
                <li key={item} className="rounded-md border p-3 text-sm">
                  <p className="break-words">{item}</p>
                  {url && (
                    <a className="mt-1 inline-block break-all underline" href={url} target="_blank" rel="noopener noreferrer">
                      {file?.name ?? t('Open proof link')}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <EvidenceAttachments links={s.links} files={s.files} />
      {s.rejectionReason && (
        <div className="rounded-md border p-3 text-sm">
          <h3 className="font-semibold"><Translate text="Rejection reason" /></h3>
          <p className="mt-1 whitespace-pre-wrap break-words">{s.rejectionReason}</p>
        </div>
      )}

      {actionable && (rejecting ? (
        <div className="space-y-2">
          <Textarea
            className="min-h-16"
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            aria-label={t("Rejection reason")}
            placeholder={t("Tell the participant what to fix.")}
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
              {review.isPending ? <Loader2 className="animate-spin" /> : null}<Translate text={"Confirm rejection"} /></Button>
            <Button onClick={() => setRejecting(false)} type="button" variant="legacy-link"><Translate text={"Cancel"} /></Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            disabled={review.isPending}
            onClick={() => review.mutate({ submissionId: s.id, decision: 'APPROVE' })}
            variant="legacy-primary"
          >
            {review.isPending ? <Loader2 className="animate-spin" /> : null}<Translate text={"Approve"} /></Button>
          <Button disabled={review.isPending} onClick={() => setRejecting(true)} variant="legacy-link"><Translate text={"Reject"} /></Button>
        </div>
      ))}
    </li>
  );
}

export default function QuestReviewPanel({
  questId, canReview, pollForSubmissions,
}: {
  questId: string;
  canReview: boolean;
  pollForSubmissions: boolean;
}) {
  const evidence = useQuestEvidence(questId, true, pollForSubmissions);
  const submissions = (evidence.data ?? []).flatMap((p) =>
    p.submissions.map((s) => ({ hunterName: p.hunter.name, s })),
  ).sort((a, b) =>
    Number(b.s.status === 'PENDING') - Number(a.s.status === 'PENDING')
    || +new Date(b.s.createdAt) - +new Date(a.s.createdAt),
  );

  return (
    <section className="surface space-y-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold"><Translate text="Submission history" /></h2>
      {evidence.isPending ? (
        <p role="status"><Translate text="Loading evidence…" /></p>
      ) : evidence.isError ? (
        <div className="space-y-2">
          <p role="alert"><Translate text="Could not load the evidence." /></p>
          <button className="btn" type="button" onClick={() => void evidence.refetch()}><Translate text="Try again" /></button>
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground"><Translate text="No evidence submitted yet." /></p>
      ) : (
        <ul className="space-y-4">
          {submissions.map(({ hunterName, s }) => (
            <ReviewItem key={s.id} hunterName={hunterName} submission={s} canReview={canReview} />
          ))}
        </ul>
      )}
    </section>
  );
}
