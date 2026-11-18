/**
 * quest-logic.ts  (solo cliente)
 *
 * Lógica del wizard que NO es visual. Las reglas de tiempo (deadline ↔ ventanas
 * ↔ intentos) NO viven aquí: se importan de `quest-timing` a través de
 * `@perkify/db/validations/quest`, para que cliente y servidor apliquen
 * exactamente las mismas.
 *
 *   1. Utilidades de fecha para la UI
 *   2. Saldo y decimales
 *   3. Evaluación completa (schema + saldo + warnings)
 *   4. Helpers de pasos
 *   5. Atajos de deadline
 *   6. Errores de wallet
 *   7. Persistencia del borrador
 */

import {
  BaseError,
  formatUnits,
  InsufficientFundsError,
  parseUnits,
  UserRejectedRequestError,
} from 'viem';
import {
  createQuestSchema,
  DAY_MS,
  EMPTY_QUEST_FORM,
  exceedsDecimals,
  HOUR_MS,
  MINUTE_MS,
  minimumDeadline,
  parseDeadline,
  recommendedDeadline,
  timingIssues,
  type QuestFormValues,
  type Severity,
} from '@perkify/db/validations/quest';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

export interface QuestIssue {
  field: string;
  message: string;
  severity: Severity;
}

/** Forma mínima del token (evita importar tipos desde archivos visuales). */
export interface TokenLike {
  id: string;
  symbol: string;
  decimals: number;
  balance: bigint | null;
}

export interface StepDef {
  readonly id: string;
  readonly fields: readonly string[];
}

/* -------------------------------------------------------------------------- */
/*  1. Utilidades de fecha para la UI                                         */
/* -------------------------------------------------------------------------- */

/** Date → valor para <input type="datetime-local"> (hora local). */
export function toDatetimeLocal(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Zona horaria del usuario, p. ej. "America/Mexico_City (UTC-6)". */
export function userTimeZoneLabel(date: Date = new Date()): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${zone} (UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''})`;
}

export function formatDeadlineUtc(date: Date): string {
  return (
    date.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) +
    ' UTC'
  );
}

/* -------------------------------------------------------------------------- */
/*  2. Saldo y decimales                                                      */
/* -------------------------------------------------------------------------- */

/** Monto como string listo para el input (botón "Max"). */
export function maxAmountString(token?: TokenLike): string {
  if (!token || token.balance === null) return '';
  return formatUnits(token.balance, token.decimals);
}

export function validateReward(
  v: Pick<QuestFormValues, 'rewardAmount' | 'tokenId'>,
  tokens: readonly TokenLike[],
): QuestIssue[] {
  const token = tokens.find((t) => t.id === v.tokenId);
  if (!token || !v.rewardAmount) return [];

  if (exceedsDecimals(v.rewardAmount, token.decimals)) {
    return [
      {
        field: 'rewardAmount',
        severity: 'error',
        message: `This token supports up to ${token.decimals} decimals`,
      },
    ];
  }

  if (token.balance !== null) {
    try {
      if (parseUnits(v.rewardAmount, token.decimals) > token.balance) {
        return [
          {
            field: 'rewardAmount',
            severity: 'error',
            message: `Insufficient balance. You have ${formatUnits(token.balance, token.decimals)} ${token.symbol}.`,
          },
        ];
      }
    } catch {
      /* formato inválido: lo reporta el schema */
    }
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/*  3. Evaluación completa (reemplaza a `validate` del wizard)                */
/* -------------------------------------------------------------------------- */

export interface Evaluation {
  /** Datos normalizados por el schema; null si hay algún ERROR (los warnings no bloquean). */
  data: ReturnType<typeof createQuestSchema.parse> | null;
  issues: QuestIssue[];
}

export function evaluateQuest(
  value: QuestFormValues,
  tokens: readonly TokenLike[],
  now: Date = new Date(),
): Evaluation {
  // El schema ya incluye las reglas de tiempo con severidad `error`
  // (se aplican cuando los campos individuales son válidos).
  const parsed = createQuestSchema.safeParse(value);
  const issues: QuestIssue[] = parsed.success
    ? []
    : parsed.error.issues.map((i) => ({
        field: String(i.path[0] ?? ''),
        message: i.message,
        severity: 'error' as const,
      }));

  const hasError = (field: string) =>
    issues.some((i) => i.field === field && i.severity === 'error');

  // Añadidos propios del cliente:
  //  - saldo / decimales (dependen del token elegido)
  //  - reglas de tiempo: aquí aparecen aunque OTRO campo tenga error (el schema
  //    las omite en ese caso) y aportan los warnings, que el schema nunca emite.
  const extra = [...validateReward(value, tokens), ...timingIssues(value, now)];
  for (const issue of extra) {
    if (issue.severity === 'error' && hasError(issue.field)) continue;
    issues.push(issue);
  }

  const blocked = issues.some((i) => i.severity === 'error');
  return { data: parsed.success && !blocked ? parsed.data : null, issues };
}

/* -------------------------------------------------------------------------- */
/*  4. Helpers de pasos                                                       */
/* -------------------------------------------------------------------------- */

/** Primer mensaje por campo; por defecto solo errores. */
export function issuesByField(
  issues: readonly QuestIssue[],
  opts: { allowed?: ReadonlySet<string>; severity?: Severity } = {},
): Record<string, string> {
  const { allowed, severity = 'error' } = opts;
  const out: Record<string, string> = {};
  for (const i of issues) {
    if (i.severity !== severity || !i.field || out[i.field]) continue;
    if (allowed && !allowed.has(i.field)) continue;
    out[i.field] = i.message;
  }
  return out;
}

/** Campos de los pasos 0..index. */
export function fieldsUpTo(steps: readonly StepDef[], index: number): Set<string> {
  return new Set(steps.slice(0, index + 1).flatMap((s) => s.fields));
}

/** Índice del primer paso con un campo en error; -1 si ninguno. */
export function firstStepWithError(
  steps: readonly StepDef[],
  issues: readonly QuestIssue[],
): number {
  const bad = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.field));
  return steps.findIndex((s) => s.fields.some((f) => bad.has(f)));
}

/* -------------------------------------------------------------------------- */
/*  5. Atajos de deadline                                                     */
/* -------------------------------------------------------------------------- */

export interface DeadlinePreset {
  label: string;
  value: string; // formato datetime-local
  disabled: boolean;
}

const PRESETS: readonly { label: string; ms: number }[] = [
  { label: '+3 days', ms: 3 * DAY_MS },
  { label: '+1 week', ms: 7 * DAY_MS },
  { label: '+2 weeks', ms: 14 * DAY_MS },
  { label: '+1 month', ms: 30 * DAY_MS },
];

/**
 * Atajos que respetan la ventana de envío ya elegida. Se deshabilitan los que
 * quedarían por debajo del mínimo (con 5 min de margen: el input trunca a minuto
 * y pasa tiempo entre elegir el atajo y validar).
 */
export function deadlinePresets(
  v: Pick<QuestFormValues, 'submitWindowHours'>,
  now: Date = new Date(),
): DeadlinePreset[] {
  const min = minimumDeadline(v, now).getTime() + 5 * MINUTE_MS;
  return PRESETS.map(({ label, ms }) => {
    const date = new Date(now.getTime() + ms);
    return { label, value: toDatetimeLocal(date), disabled: date.getTime() < min };
  });
}

/* -------------------------------------------------------------------------- */
/*  6. Errores de wallet                                                      */
/* -------------------------------------------------------------------------- */

export interface ParsedError {
  message: string;
  /** El usuario canceló: mostrar en tono neutro, no como fallo. */
  isRejection: boolean;
}

const REJECTED = 'You rejected the request in your wallet.';

export function parseWalletError(e: unknown): ParsedError {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) {
      return { message: REJECTED, isRejection: true };
    }
    if (e.walk((x) => x instanceof InsufficientFundsError)) {
      return { message: 'Not enough funds to cover gas on this network.', isRejection: false };
    }
    return { message: e.shortMessage || 'Transaction failed.', isRejection: false };
  }
  if (e instanceof Error) {
    const rejected = /user rejected|user denied/i.test(e.message);
    return { message: rejected ? REJECTED : e.message, isRejection: rejected };
  }
  return { message: 'Error saving the quest.', isRejection: false };
}

/* -------------------------------------------------------------------------- */
/*  7. Persistencia del borrador del formulario                               */
/* -------------------------------------------------------------------------- */

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * DAY_MS;

interface StoredDraft {
  v: number;
  savedAt: number;
  step: number;
  values: Partial<QuestFormValues>;
}

/** Clave por usuario/wallet, para que cuentas distintas no mezclen borradores. */
export const draftKey = (owner: string) => `perkify:quest-draft:${owner.toLowerCase()}`;

export function saveFormDraft(key: string, values: QuestFormValues, step: number): void {
  try {
    const payload: StoredDraft = { v: DRAFT_VERSION, savedAt: Date.now(), step, values };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* cuota llena o modo privado: se ignora */
  }
}

export function loadFormDraft(
  key: string,
): { values: QuestFormValues; step: number; savedAt: Date } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as StoredDraft;
    if (d.v !== DRAFT_VERSION || Date.now() - d.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    const values = { ...EMPTY_QUEST_FORM, ...d.values } as QuestFormValues;
    // Un deadline vencido no sirve: se descarta para no mostrar un error injustificado.
    const deadline = parseDeadline(values.deadline);
    if (deadline && deadline.getTime() < Date.now()) values.deadline = '';

    return { values, step: Math.max(0, d.step | 0), savedAt: new Date(d.savedAt) };
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** ¿Vale la pena ofrecer restaurar? (evita avisar por un formulario vacío). */
export function isMeaningfulDraft(values: QuestFormValues): boolean {
  return (
    values.title.trim() !== '' ||
    values.description.trim() !== '' ||
    values.milestones.length > 0 ||
    values.rewardAmount !== ''
  );
}

/* -------------------------------------------------------------------------- */
/*  8. Guía visual: textos de política, timeline y agrupación por paso        */
/* -------------------------------------------------------------------------- */

/**
 * Textos que prometen algo sobre el contrato.
 * CONFIRMAR con el contrato antes de publicar: si no se cumplen, ajustar o poner null.
 */
export const POLICY_COPY = {
  refund: 'If nobody completes the quest, the funds return to your wallet after the deadline.' as
    | string
    | null,
};

export const TIMING_FIELDS = [
  'deadline',
  'submitWindowHours',
  'reviewWindowHours',
  'maxAttempts',
] as const;

const isTimingField = (f: string) => (TIMING_FIELDS as readonly string[]).includes(f);

/** Atajo "el más pronto recomendado": redondeado hacia arriba a 15 min. */
export function earliestRecommendedLocal(
  v: Pick<QuestFormValues, 'submitWindowHours' | 'reviewWindowHours'>,
  now: Date = new Date(),
): string {
  const quarter = 15 * MINUTE_MS;
  const target = recommendedDeadline(v, now).getTime();
  return toDatetimeLocal(new Date(Math.ceil(target / quarter) * quarter));
}

export interface TimelineModel {
  status: 'ok' | 'tight' | 'error';
  deadline: Date;
  /** Último momento en que alguien puede unirse y aún ser revisado a tiempo. null si ya no hay margen. */
  joinCutoff: Date | null;
  joinHours: number;
  submitHours: number;
  reviewHours: number;
  attempts: number;
}

/** null si faltan datos para dibujar el calendario (fecha vacía o números vacíos). */
export function buildTimeline(
  v: Pick<
    QuestFormValues,
    'deadline' | 'submitWindowHours' | 'reviewWindowHours' | 'maxAttempts'
  >,
  issues: readonly QuestIssue[],
  now: Date = new Date(),
): TimelineModel | null {
  const deadline = parseDeadline(v.deadline);
  const s = v.submitWindowHours;
  const r = v.reviewWindowHours;
  const a = v.maxAttempts;
  if (!deadline || !Number.isFinite(s) || !Number.isFinite(r) || !Number.isFinite(a)) return null;

  const related = issues.filter((i) => isTimingField(i.field));
  const status = related.some((i) => i.severity === 'error')
    ? 'error'
    : related.length > 0
      ? 'tight'
      : 'ok';

  const hoursLeft = (deadline.getTime() - now.getTime()) / HOUR_MS;
  const joinHours = Math.max(0, hoursLeft - (s + r));
  return {
    status,
    deadline,
    joinCutoff: joinHours > 0 ? new Date(deadline.getTime() - (s + r) * HOUR_MS) : null,
    joinHours,
    submitHours: s,
    reviewHours: r,
    attempts: a,
  };
}

/** Errores agrupados por paso, para la lista "Fix" de la pantalla de revisión. */
export function groupIssuesByStep(
  steps: readonly (StepDef & { title: string })[],
  issues: readonly QuestIssue[],
): { step: number; title: string; messages: string[] }[] {
  const out: { step: number; title: string; messages: string[] }[] = [];
  steps.forEach((s, step) => {
    const messages = [
      ...new Set(
        issues
          .filter((i) => i.severity === 'error' && s.fields.includes(i.field))
          .map((i) => i.message),
      ),
    ];
    if (messages.length) out.push({ step, title: s.title, messages });
  });
  return out;
}