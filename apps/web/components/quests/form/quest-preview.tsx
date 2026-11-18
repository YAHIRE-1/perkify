'use client';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@perkify/ui/components/button';
import { formatHours, parseDeadline, type QuestFormValues } from '@perkify/db/validations/quest';
import { formatDeadlineUtc, POLICY_COPY } from './quest-logic';
import type { TokenOption } from './quest-steps';

/* -------------------------------------------------------------------------- */
/*  Stepper: se puede volver a cualquier paso ya alcanzado                    */
/* -------------------------------------------------------------------------- */

export type StepStatus = 'current' | 'done' | 'error' | 'todo';

const STATUS_LABEL: Record<StepStatus, string> = {
  current: 'current step',
  done: 'completed',
  error: 'needs attention',
  todo: 'not reached yet',
};

interface StepperProps {
  steps: readonly { id: string; title: string }[];
  current: number;
  /** Paso más lejano al que ya llegó el usuario: hasta ahí puede saltar. */
  maxReached: number;
  statuses: readonly StepStatus[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export function QuestStepper({
  steps,
  current,
  maxReached,
  statuses,
  onSelect,
  disabled,
}: StepperProps) {
  return (
    <nav aria-label="Quest creation progress">
      {/* Móvil: texto + barra de progreso */}
      <div className="space-y-1.5 md:hidden">
        <p className="text-sm text-muted-foreground">
          Step {current + 1} of {steps.length}: {steps[current].title}
        </p>
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-[width]"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Escritorio: pasos clicables hasta donde ya se llegó */}
      <ol className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        {steps.map((s, i) => {
          const status = statuses[i];
          const reachable = i <= maxReached;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                aria-current={status === 'current' ? 'step' : undefined}
                className={
                  'flex items-center gap-2 text-sm ' +
                  (reachable && !disabled ? 'cursor-pointer' : 'cursor-default')
                }
                disabled={disabled || !reachable}
                onClick={() => onSelect(i)}
                type="button"
              >
                <span
                  className={
                    'flex size-6 items-center justify-center rounded-full border text-xs ' +
                    (status === 'current' || status === 'done'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : status === 'error'
                        ? 'border-destructive text-destructive'
                        : 'text-muted-foreground')
                  }
                >
                  {status === 'done' ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : status === 'error' ? (
                    '!'
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={
                    status === 'current'
                      ? 'font-medium'
                      : status === 'error'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  }
                >
                  {s.title}
                  <span className="sr-only">, {STATUS_LABEL[status]}</span>
                </span>
              </button>
              {i < steps.length - 1 && <span aria-hidden className="h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vista previa                                                              */
/* -------------------------------------------------------------------------- */

interface PreviewProps {
  values: QuestFormValues;
  token?: TokenOption;
  // Índices de paso a los que se puede volver a editar. Omitir = solo lectura.
  onEdit?: (step: number) => void;
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit?: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {onEdit && (
          <Button type="button" variant="legacy-link" onClick={() => onEdit(step)}>
            Edit
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

const fmt = (d: Date) => d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function QuestPreview({ values: v, token, onEdit }: PreviewProps) {
  const deadline = parseDeadline(v.deadline);

  return (
    <article className="grid gap-3 break-words">
      <Section onEdit={onEdit} step={0} title="Hunter preview">
        <div className="space-y-2">
          {v.category.trim() && <p className="text-xs text-muted-foreground">{v.category.trim()}</p>}
          <h2 className="text-xl font-semibold">{v.title.trim()}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{v.description.trim()}</p>
        </div>
      </Section>

      <Section onEdit={onEdit} step={3} title="Reward">
        <p className="text-2xl font-semibold">
          {v.rewardAmount} {token?.symbol}
          {v.isBoosted && (
            <span className="ml-3 align-middle text-xs font-normal text-muted-foreground">
              Boosted
            </span>
          )}
        </p>
      </Section>

      <Section onEdit={onEdit} step={1} title="What participants must do">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {v.milestones.map((m, i) => (
            <li key={`${i}-${m}`}>{m}</li>
          ))}
        </ol>
        {v.criteria.trim() && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{v.criteria.trim()}</p>
        )}
        {v.validationChecklist.length > 0 && (
          <ul className="space-y-1 text-sm">
            {v.validationChecklist.map((c, i) => (
              <li key={`${i}-${c}`} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {c}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section onEdit={onEdit} step={2} title="Schedule">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <dt className="text-muted-foreground">Closes on</dt>
            <dd>
              {deadline ? fmt(deadline) : '—'}
              {deadline && (
                <span className="block text-xs text-muted-foreground">
                  {formatDeadlineUtc(deadline)}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Time to submit</dt>
            <dd>{formatHours(v.submitWindowHours)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Time to review</dt>
            <dd>{formatHours(v.reviewWindowHours)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Attempts each</dt>
            <dd>{v.maxAttempts}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Participants</dt>
            <dd>{v.maxParticipants === 0 ? 'No limit' : v.maxParticipants}</dd>
          </div>
        </dl>
      </Section>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Resumen de la transacción (qué se firma, antes del botón final)           */
/* -------------------------------------------------------------------------- */

interface SummaryProps {
  values: QuestFormValues;
  token?: TokenOption;
  /** Red de la wallet conectada (la app cambia de red si hace falta). */
  networkName?: string;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  /** Con borrador ya creado no se vuelve a pedir la confirmación. */
  locked: boolean;
}

export function TransactionSummary({
  values: v,
  token,
  networkName,
  acknowledged,
  onAcknowledge,
  locked,
}: SummaryProps) {
  const deadline = parseDeadline(v.deadline);

  return (
    <aside className="surface space-y-3 p-5">
      <h3 className="text-sm font-medium">What you are about to sign</h3>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Locked in escrow</dt>
          <dd className="text-lg font-semibold">
            {v.rewardAmount} {token?.symbol}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Deposit network</dt>
          <dd>{networkName ?? '—'}</dd>
        </div>
        {deadline && (
          <div>
            <dt className="text-muted-foreground">Closes on</dt>
            <dd>{fmt(deadline)}</dd>
          </div>
        )}
        {POLICY_COPY.refund && (
          <div>
            <dt className="text-muted-foreground">If nobody completes it</dt>
            <dd>{POLICY_COPY.refund}</dd>
          </div>
        )}
      </dl>

      {!locked && (
        <label className="surface-2 flex items-start gap-3 p-3 text-sm">
          <input
            checked={acknowledged}
            className="mt-0.5 size-4"
            onChange={(e) => onAcknowledge(e.target.checked)}
            type="checkbox"
          />
          <span>
            I understand that {v.rewardAmount} {token?.symbol} will be locked in escrow when I
            confirm.
          </span>
        </label>
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  Errores y avisos en la revisión                                           */
/* -------------------------------------------------------------------------- */

interface ReviewIssuesProps {
  groups: { step: number; title: string; messages: string[] }[];
  warnings: string[];
  /** Con borrador creado no se puede editar: se ofrece empezar uno nuevo. */
  locked: boolean;
  onFix: (step: number) => void;
  onStartOver: () => void;
}

export function ReviewIssues({ groups, warnings, locked, onFix, onStartOver }: ReviewIssuesProps) {
  if (groups.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.length > 0 && (
        <div className="space-y-3 rounded-lg border border-destructive p-4" role="alert">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle aria-hidden className="size-4" />
            Fix this before you can fund the quest
          </p>
          <ul className="space-y-2 text-sm">
            {groups.map((g) => (
              <li key={g.step} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{g.title}:</span>
                <span className="text-muted-foreground">{g.messages.join(' ')}</span>
                {!locked && (
                  <Button type="button" variant="legacy-link" onClick={() => onFix(g.step)}>
                    Fix
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {locked && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                This saved draft can no longer be funded as it is. You can start a new draft with
                your current answers and change what needs fixing.
              </p>
              <Button type="button" variant="legacy" onClick={onStartOver}>
                Start a new draft
              </Button>
            </div>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p className="font-medium text-amber-600 dark:text-amber-400">
            Worth a second look (you can still continue)
          </p>
          <ul className="space-y-1 text-muted-foreground">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Progreso del fondeo                                                       */
/* -------------------------------------------------------------------------- */

const FUNDING_STEPS = [
  { id: 'creating', label: 'Save the draft' },
  { id: 'approving', label: 'Approve the token' },
  { id: 'depositing', label: 'Deposit into escrow' },
  { id: 'confirming', label: 'Verify on-chain' },
] as const;

export function FundingProgress({ step }: { step: string }) {
  // `switching` ocurre antes de aprobar: lo mostramos como parte del borrador.
  const idx = FUNDING_STEPS.findIndex((s) => s.id === (step === 'switching' ? 'creating' : step));
  const running = step !== 'idle';

  return (
    <aside aria-live="polite" className="surface space-y-3 p-5">
      <h3 className="text-sm font-medium">When you confirm</h3>
      <ul className="space-y-2 text-sm">
        {FUNDING_STEPS.map((s, i) => (
          <li
            key={s.id}
            className={'flex items-center gap-2 ' + (running && i > idx ? 'text-muted-foreground' : '')}
          >
            {running && i < idx && s.id !== 'approving' ? (
              <Check className="size-4" />
            ) : running && i === idx ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="size-4 text-center text-xs text-muted-foreground">{i + 1}</span>
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Your wallet will ask for confirmation. The token approval is skipped if you already allowed
        enough.
      </p>
    </aside>
  );
}