'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Scale } from 'lucide-react';
import Link from 'next/link';
import type { AppRouterInputs } from '@perkify/api/routers/index';
import { useAuth } from '@/components/Providers';
import { useInvalidateQuestQueries } from '@/hooks/quest/use-quest';
import { Translate, useLanguage } from '@/lib/i18n/provider';
import { orpc } from '@/utils/orpc';

const rulings = {
  PAY_PARTICIPANT: 'Approve evidence and pay reward',
  REFUND_CREATOR: 'Reject evidence and refund creator',
} as const;

type Ruling = AppRouterInputs['disputes']['resolve']['ruling'];

export default function DisputesPage() {
  const { user, loading } = useAuth();

  return (
    <main className="mx-auto max-w-4xl space-y-5">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
        <Scale aria-hidden className="size-7 text-primary" />
        <Translate text="Disputes" />
      </h1>
      {loading ? <p role="status"><Translate text="Loading disputes…" /></p>
        : user ? <DisputeWorkspace key={user.id} userId={user.id} />
        : <p className="surface p-5"><Translate text="Sign in to view your disputes." /></p>}
    </main>
  );
}

function DisputeWorkspace({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'mine' | 'queue'>('mine');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const permission = orpc.disputes.permissions.queryOptions();
  const permissions = useQuery({
    ...permission,
    queryKey: [...permission.queryKey, userId],
    refetchInterval: 30_000,
  });
  const moderate = permissions.data?.moderate === true;
  const showQueue = moderate && tab === 'queue';
  const options = showQueue
    ? orpc.disputes.queue.queryOptions({ input: { page } })
    : orpc.disputes.mine.queryOptions({ input: { page } });
  const cases = useQuery({
    ...options,
    queryKey: [...options.queryKey, userId],
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  if (selected) return <DisputeCase key={selected} id={selected} userId={userId} close={() => setSelected(undefined)} />;

  return (
    <>
      {moderate && (
        <div className="flex flex-wrap gap-2" aria-label={t("Disputes")}>
          <button type="button" className={showQueue ? 'btn' : 'btn btn-primary'} aria-pressed={!showQueue}
            onClick={() => { setTab('mine'); setPage(1); }}>
            <Translate text="My disputes" />
          </button>
          <button type="button" className={showQueue ? 'btn btn-primary' : 'btn'} aria-pressed={showQueue}
            onClick={() => { setTab('queue'); setPage(1); }}>
            <Translate text="Moderation queue" />
          </button>
        </div>
      )}
      {cases.isPending ? <p role="status"><Translate text="Loading disputes…" /></p>
        : cases.isError ? <p role="alert" className="text-destructive"><Translate text="Could not load disputes." /></p>
        : cases.data.items.length === 0 ? (
          <p className="surface p-5 text-muted-foreground">
            <Translate text={showQueue ? 'There are no open disputes to review.' : 'You have no disputes on record.'} />
          </p>
        ) : (
          <ul className="space-y-2">
            {cases.data.items.map((item) => (
              <li key={item.id} className="surface">
                <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                  onClick={() => setSelected(item.id)}>
                  <span className="space-y-1">
                    <span className="block font-medium">{item.title}</span>
                    {!showQueue && (
                      <span className="block text-xs text-muted-foreground">
                        <Translate text={item.received ? 'Dispute received' : 'Dispute you opened'} />
                      </span>
                    )}
                  </span>
                  <DisputeStatus status={item.status} hasRuling={item.ruling !== null} />
                </button>
              </li>
            ))}
          </ul>
        )}
      {(page > 1 || cases.data?.hasMore) && (
        <nav className="flex justify-between gap-2" aria-label={t("Dispute pages")}>
          <button type="button" className="btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <Translate text="Previous" />
          </button>
          <button type="button" className="btn" disabled={!cases.data?.hasMore || cases.isPlaceholderData}
            onClick={() => setPage(page + 1)}>
            <Translate text="Next" />
          </button>
        </nav>
      )}
    </>
  );
}

function DisputeStatus({ status, hasRuling }: { status: 'open' | 'resolved' | 'closed'; hasRuling: boolean }) {
  const label = status === 'resolved' ? 'Resolved'
    : status === 'closed' ? 'Closed'
    : hasRuling ? 'Ruling recorded · Pending execution' : 'Open';
  return <span className="rounded-full border px-3 py-1 text-xs font-medium"><Translate text={label} /></span>;
}

function DisputeCase({ id, userId, close }: { id: string; userId: string; close: () => void }) {
  const options = orpc.disputes.get.queryOptions({ input: { id } });
  const dispute = useQuery({
    ...options,
    queryKey: [...options.queryKey, userId],
    refetchInterval: (query) => query.state.data?.status === 'open' ? 15_000 : false,
  });
  const item = dispute.data;
  const { locale } = useLanguage();
  const translation = useMutation(orpc.disputes.translate.mutationOptions());
  const currentTranslation = translation.variables?.locale === locale;
  const translated = currentTranslation ? translation.data : undefined;
  const translatedEvidence = new Map(translated?.evidence.map((item) => [item.id, item]));
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn" onClick={close}>
          <ArrowLeft aria-hidden className="size-4" /><Translate text="Back to disputes" />
        </button>
        {item && (
          <button type="button" className="btn" disabled={translation.isPending}
            aria-describedby={translated ? undefined : 'dispute-translation-provider'}
            onClick={() => {
              if (translated) translation.reset();
              else translation.mutate({ id, locale });
            }}>
            <Translate text={translation.isPending ? 'Translating…' : translated ? 'Show original' : 'Translate dispute'} />
          </button>
        )}
      </div>
      {item && !translated && (
        <p id="dispute-translation-provider" className="text-xs text-muted-foreground">
          <Translate text="Translation sends the case text to Google Translate." />
        </p>
      )}
      {currentTranslation && translation.isError && (
        <p role="alert" className="text-sm text-destructive">
          <Translate text="Dispute translation is currently unavailable." />
        </p>
      )}
      {dispute.isError ? <p role="alert" className="text-destructive"><Translate text="Could not load this dispute." /></p>
        : !item ? <p role="status"><Translate text="Loading dispute…" /></p>
        : (
          <>
            <header className="surface space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{translated?.title ?? item.title}</h2>
                <DisputeStatus status={item.status} hasRuling={item.ruling !== null} />
              </div>
              <Link className="underline" href={`/quests/${item.questId}`}><Translate text="View quest" /></Link>
              <p className="whitespace-pre-wrap break-words">{translated?.reason ?? item.reason}</p>
              {item.status === 'open' && item.ruling && (
                <p className="text-sm text-muted-foreground">
                  <Translate text={item.frozen ? 'Waiting for the transfer to be confirmed.' : 'The server will lock the escrow before sending the transfer.'} />
                </p>
              )}
              {item.ruling && (
                <div className="space-y-1 border-t pt-3">
                  <p className="font-medium">
                    <Translate text={rulings[item.ruling]} />
                  </p>
                  {item.rulingReason && <p className="whitespace-pre-wrap break-words">{translated?.rulingReason ?? item.rulingReason}</p>}
                  {item.resolvedAt && <time dateTime={item.resolvedAt.toISOString()}>{dateFormat.format(item.resolvedAt)}</time>}
                  {item.status === 'resolved' && item.resolveTxHash && (
                    <p className="break-all text-xs text-muted-foreground">{item.resolveTxHash}</p>
                  )}
                </div>
              )}
            </header>
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold"><Translate text="Evidence and rejection reasons" /></h2>
              {item.evidence.map((evidence) => (
                <article key={evidence.id} className="surface space-y-3 p-5">
                  <time className="text-sm text-muted-foreground" dateTime={evidence.createdAt.toISOString()}>
                    {dateFormat.format(evidence.createdAt)}
                  </time>
                  <p className="whitespace-pre-wrap break-words">{translatedEvidence.get(evidence.id)?.notes ?? evidence.notes}</p>
                  <ul className="space-y-1">
                    {evidence.links.filter((value) => URL.canParse(value) && /^https?:/i.test(value)).map((url, index) => (
                      <li key={`${index}-${url}`}><EvidenceLink href={url}>{url}</EvidenceLink></li>
                    ))}
                    {evidence.files.map((file) => (
                      <li key={file.id}><EvidenceLink href={file.url}>{file.name}</EvidenceLink></li>
                    ))}
                  </ul>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium"><Translate text="Rejection reason" /></p>
                    <p className="whitespace-pre-wrap break-words">{translatedEvidence.get(evidence.id)?.rejectionReason ?? evidence.rejectionReason}</p>
                  </div>
                </article>
              ))}
            </section>
            {item.canResolve && <RulingForm id={item.id} />}
          </>
        )}
    </div>
  );
}

function EvidenceLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 break-all underline">
      {children}<ExternalLink aria-hidden className="mt-0.5 size-3 shrink-0" />
    </a>
  );
}

function RulingForm({ id }: { id: string }) {
  const [ruling, setRuling] = useState<Ruling>();
  const [reason, setReason] = useState('');
  const invalidate = useInvalidateQuestQueries();
  const resolve = useMutation(orpc.disputes.resolve.mutationOptions({ onSuccess: invalidate }));

  return (
    <form className="surface space-y-3 p-5" onSubmit={(event) => {
      event.preventDefault();
      if (ruling) resolve.mutate({ id, ruling, reason });
    }}>
      <h2 className="font-display text-xl font-semibold"><Translate text="Resolve dispute" /></h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={resolve.isPending} aria-pressed={ruling === 'PAY_PARTICIPANT'}
          onClick={() => setRuling('PAY_PARTICIPANT')}><Translate text={rulings.PAY_PARTICIPANT} /></button>
        <button type="button" className="btn" disabled={resolve.isPending} aria-pressed={ruling === 'REFUND_CREATOR'}
          onClick={() => setRuling('REFUND_CREATOR')}><Translate text={rulings.REFUND_CREATOR} /></button>
      </div>
      {ruling && (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium"><Translate text="Reason for your ruling" /></span>
            <textarea className="w-full rounded-md border bg-transparent p-2" value={reason} required minLength={5}
              maxLength={1000} disabled={resolve.isPending} onChange={(event) => setReason(event.target.value)} />
          </label>
          <p className="text-sm text-muted-foreground"><Translate text="The server will execute the ruling in the background. The quest closes after the transfer is confirmed." /></p>
          <button type="submit" className="btn btn-primary" disabled={resolve.isPending || reason.trim().length < 5}>
            <Translate text={resolve.isPending ? 'Saving ruling…' : 'Confirm ruling'} />
          </button>
        </>
      )}
      {resolve.isError && <p role="alert" className="text-destructive"><Translate text={resolve.error.message} /></p>}
    </form>
  );
}
