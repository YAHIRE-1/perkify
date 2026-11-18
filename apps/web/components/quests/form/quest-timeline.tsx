'use client';
import { Translate } from '@/lib/i18n/provider';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatHours, type QuestFormValues } from '@perkify/db/validations/quest';
import {
  buildTimeline,
  POLICY_COPY,
  TIMING_FIELDS,
  type QuestIssue,
} from './quest-logic';

const fmt = (d: Date) => d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface Props {
  values: QuestFormValues;
  issues: readonly QuestIssue[];
}

/**
 * Traduce los números del formulario a un calendario que cualquiera entiende.
 * Se actualiza mientras el usuario escribe y es la ÚNICA fuente de mensajes
 * sobre cómo chocan deadline, ventanas e intentos.
 */
export function QuestTimeline({ values, issues }: Props) {
  const model = buildTimeline(values, issues);

  // Mensajes de tiempo sin duplicados, errores primero.
  const messages = [
    ...new Map(
      issues
        .filter((i) => (TIMING_FIELDS as readonly string[]).includes(i.field))
        .sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'))
        .map((i) => [i.message, i] as const),
    ).values(),
  ];

  return (
    <div aria-live="polite" className="surface space-y-4 p-5">
      <h3 className="text-sm font-medium"><Translate text={"How it will work"} /></h3>

      {!model ? (
        <p className="text-sm text-muted-foreground"><Translate text={"Choose how long people have and pick a deadline to see the schedule."} /></p>
      ) : (
        <>
          {model.status !== 'error' && (
            <div className="space-y-2">
              <div
                aria-label={`${model.joinHours > 0 ? `Join period, ` : ''}${formatHours(model.submitHours)} to submit, ${formatHours(model.reviewHours)} to review`}
                className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
                role="img"
              >
                {model.joinHours > 0 && (
                  <div
                    className="rounded-full bg-muted-foreground opacity-30"
                    style={{ flexGrow: model.joinHours, flexBasis: 0 }}
                  />
                )}
                <div
                  className="rounded-full bg-primary"
                  style={{ flexGrow: model.submitHours, flexBasis: 0, minWidth: '0.75rem' }}
                />
                <div
                  className="rounded-full bg-primary opacity-50"
                  style={{ flexGrow: model.reviewHours, flexBasis: 0, minWidth: '0.75rem' }}
                />
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {model.joinHours > 0 && (
                  <li className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-muted-foreground opacity-30" /><Translate text={"Time to join with full windows"} /></li>
                )}
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" /><Translate text={"Submit ("} />{formatHours(model.submitHours)})
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary opacity-50" /><Translate text={"Your review ("} />{formatHours(model.reviewHours)})
                </li>
              </ul>
            </div>
          )}

          <ol className="space-y-3 text-sm">
            <li>
              <p className="font-medium"><Translate text={"When you confirm"} /></p>
              <p className="text-muted-foreground"><Translate text={"You lock the reward in escrow and the quest goes live."} /></p>
            </li>
            <li>
              <p className="font-medium">
                {model.joinCutoff
                  ? `Join by ${fmt(model.joinCutoff)} for the full windows`
                  : 'The full submission and review windows don’t fit'}
              </p>
              <p className="text-muted-foreground"><Translate text={"Hunters can still join until the quest closes if a spot is available. Their submission window ends at the closing time or earlier."} /></p>
            </li>
            <li>
              <p className="font-medium"><Translate text={"Each hunter gets up to"} />{' '}{formatHours(model.submitHours)}{' '}<Translate text={"to submit"} /></p>
              <p className="text-muted-foreground"><Translate text={"Then you have"} />{' '}{formatHours(model.reviewHours)}{' '}<Translate text={"to approve or reject."} />{' '}
                {model.attempts === 1
                  ? 'They get one attempt.'
                  : `They can try up to ${model.attempts} times.`}
              </p>
            </li>
            <li>
              <p className="font-medium"><Translate text={"The quest closes on"} />{' '}{fmt(model.deadline)}</p>
              {POLICY_COPY.refund && <p className="text-muted-foreground">{POLICY_COPY.refund}</p>}
            </li>
          </ol>
        </>
      )}

      {messages.length > 0 ? (
        <ul className="space-y-2 border-t pt-3 text-sm">
          {messages.map((m) => (
            <li
              key={m.message}
              className={
                'flex gap-2 ' +
                (m.severity === 'error'
                  ? 'text-destructive'
                  : 'text-amber-600 dark:text-amber-400')
              }
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{m.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        model && (
          <p className="flex items-center gap-2 border-t pt-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 aria-hidden className="size-4 shrink-0" /><Translate text={"The schedule fits: people have time to submit and be reviewed."} /></p>
        )
      )}
    </div>
  );
}