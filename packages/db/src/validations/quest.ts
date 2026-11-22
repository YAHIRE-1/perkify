import { z } from "zod";
import { questStatusEnum } from "../schema/quest.enums";

const questStatusSchema = z.enum(questStatusEnum.enumValues);

// Límites: única fuente de verdad (schema + inputs `maxLength` de la UI).
export const QUEST_LIMITS = {
  title: 120,
  description: 10_000,
  category: 60,
  criteria: 5_000,
  milestoneItems: 20,
  milestoneLength: 300,
  checklistItems: 20,
  checklistLength: 200,
  maxParticipants: 100,
  submitWindowHours: { min: 1, max: 720 },
  reviewWindowHours: { min: 1, max: 168 },
  maxAttempts: { min: 1, max: 5 },
} as const;

const L = QUEST_LIMITS;

// Mismos defaults que la tabla `quests` (también los usa EMPTY_QUEST_FORM).
export const QUEST_DEFAULTS = {
  maxParticipants: 3,
  submitWindowHours: 72,
  reviewWindowHours: 72,
  maxAttempts: 3,
} as const;

/* -------------------------------------------------------------------------- */
/*  NUEVO · Reglas de tiempo: deadline ↔ ventanas ↔ intentos                  */
/*  Sin dependencias: las usa el schema (servidor y cliente) y la UI.         */
/*    - error:   bloquea (lo rechaza el schema)                               */
/*    - warning: solo se muestra en la UI; el schema nunca lo usa             */
/* -------------------------------------------------------------------------- */

export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * HOUR_MS;

/** AJUSTAR a lo que valide el contrato. */
export const DEADLINE_RULES = {
  /** Margen para que approve + deposit se minen antes de que el deadline venza. */
  minLeadMinutes: 30,
  /** Plazo máximo desde hoy. */
  maxDays: 365,
  /** <input type="datetime-local"> trunca a minuto: se tolera ese desfase. */
  toleranceSeconds: 60,
} as const;

export type Severity = "error" | "warning";
export type TimingField = "deadline" | "submitWindowHours" | "reviewWindowHours" | "maxAttempts";

export interface TimingIssue {
  field: TimingField;
  message: string;
  severity: Severity;
}

export interface TimingInput {
  deadline?: string | null;
  submitWindowHours?: number;
  reviewWindowHours?: number;
  maxAttempts?: number;
}

/**
 * undefined → default de la tabla (así lo resuelve el servidor).
 * NaN (input vacío en el cliente) → undefined: se omite la regla y el
 * schema ya reporta "Enter ...".
 */
const resolve = (n: number | undefined, fallback: number): number | undefined =>
  n === undefined ? fallback : Number.isFinite(n) ? n : undefined;

export function parseDeadline(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  if (hours < 48) return `${hours} h`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

/** Deadline mínimo OBLIGATORIO: ahora + max(margen on-chain, ventana de envío). */
export function minimumDeadline(
  v: Pick<TimingInput, "submitWindowHours">,
  now: Date = new Date(),
): Date {
  const submit = resolve(v.submitWindowHours, QUEST_DEFAULTS.submitWindowHours) ?? 0;
  return new Date(
    now.getTime() + Math.max(DEADLINE_RULES.minLeadMinutes * MINUTE_MS, submit * HOUR_MS),
  );
}

/** Deadline RECOMENDADO: ahora + ventana de envío + ventana de revisión. */
export function recommendedDeadline(
  v: Pick<TimingInput, "submitWindowHours" | "reviewWindowHours">,
  now: Date = new Date(),
): Date {
  const s = resolve(v.submitWindowHours, QUEST_DEFAULTS.submitWindowHours) ?? 0;
  const r = resolve(v.reviewWindowHours, QUEST_DEFAULTS.reviewWindowHours) ?? 0;
  return new Date(now.getTime() + (s + r) * HOUR_MS);
}

/**
 * Cuando una regla involucra campos de pasos distintos, se reporta en AMBOS
 * campos (con mensajes distintos) para que el usuario la vea donde esté editando.
 */
export function timingIssues(v: TimingInput, now: Date = new Date()): TimingIssue[] {
  const deadline = parseDeadline(v.deadline);
  if (!deadline) return []; // vacío / inválido: lo reporta el schema

  const submit = resolve(v.submitWindowHours, QUEST_DEFAULTS.submitWindowHours);
  const review = resolve(v.reviewWindowHours, QUEST_DEFAULTS.reviewWindowHours);
  const attempts = resolve(v.maxAttempts, QUEST_DEFAULTS.maxAttempts);

  const msLeft = deadline.getTime() - now.getTime();
  const tol = DEADLINE_RULES.toleranceSeconds * 1000;
  const hoursLeft = Math.max(0, Math.floor(msLeft / HOUR_MS));
  const issues: TimingIssue[] = [];

  // E1. Margen mínimo para que la tx on-chain se confirme.
  if (msLeft + tol < DEADLINE_RULES.minLeadMinutes * MINUTE_MS) {
    return [
      {
        field: "deadline",
        severity: "error",
        message: `Choose a deadline at least ${DEADLINE_RULES.minLeadMinutes} minutes from now: the on-chain deposit needs time to confirm.`,
      },
    ];
  }

  // E2. El deadline no puede ser menor que la ventana de envío.
  if (submit !== undefined && msLeft + tol < submit * HOUR_MS) {
    issues.push(
      {
        field: "deadline",
        severity: "error",
        message: `The deadline is sooner than the submission window (${formatHours(submit)}). Move it later or shorten the window.`,
      },
      {
        field: "submitWindowHours",
        severity: "error",
        message: `Longer than the time left until the deadline (${formatHours(hoursLeft)}). Shorten it or move the deadline.`,
      },
    );
  }

  // E3. Deadline demasiado lejano.
  if (msLeft > DEADLINE_RULES.maxDays * DAY_MS) {
    issues.push({
      field: "deadline",
      severity: "error",
      message: `The deadline can be at most ${DEADLINE_RULES.maxDays} days from now.`,
    });
  }

  // Warnings: solo si no hay errores previos.
  if (issues.length === 0) {
    // W1. Envío + revisión no caben antes del deadline.
    if (submit !== undefined && review !== undefined && msLeft + tol < (submit + review) * HOUR_MS) {
      issues.push({
        field: "deadline",
        severity: "warning",
        message: `Participants who join now need up to ${formatHours(submit + review)} to submit and be reviewed, but only ${formatHours(hoursLeft)} are left. Late submissions may not get reviewed before the deadline.`,
      });
    }

    // W2. Varios intentos no caben en el tiempo restante.
    if (
      submit !== undefined &&
      attempts !== undefined &&
      attempts > 1 &&
      msLeft + tol < attempts * submit * HOUR_MS
    ) {
      issues.push({
        field: "maxAttempts",
        severity: "warning",
        message: `${attempts} attempts of ${formatHours(submit)} each don't fit before the deadline. Some attempts won't be usable.`,
      });
    }
  }

  return issues;
}

/* -------------------------------------------------------------------------- */
/*  Schemas                                                                   */
/* -------------------------------------------------------------------------- */

// NaN (input numérico vacío) cae en el mensaje de tipo inválido.
const int = (label: string, min: number, max: number) =>
  z
    .number({ message: `Enter ${label}` })
    .int("Use a whole number")
    .min(min, `Minimum is ${min}`)
    .max(max, `Maximum is ${max}`);

// Lo único que depende del token: cuántos decimales admite. El schema valida
// hasta 18; el cliente (token elegido) y el servicio (token en BD) llaman esto.
export const exceedsDecimals = (amount: string, decimals: number) =>
  (amount.split(".")[1]?.length ?? 0) > decimals;

/**
 * CAMBIO · Schema BASE (tu `createQuestSchema` original, sin tocar).
 * Úsalo para `.partial()`, `.pick()`, `.extend()` y `.shape`: los
 * refinamientos entre campos viven solo en `createQuestSchema`.
 */
export const createQuestBase = z.object({
  title: z.string().trim().min(3, "Give your quest a title (3+ characters)").max(L.title),
  description: z
    .string()
    .trim()
    .min(20, "Describe the quest in at least 20 characters")
    .max(L.description),
  category: z.string().trim().max(L.category).nullish(),
  criteria: z.string().trim().max(L.criteria).nullish(),
  rewardAmount: z
    .string()
    .trim()
    .min(1, "Enter the reward amount")
    .regex(/^\d{1,18}(\.\d{1,18})?$/, "Use a valid number, e.g. 25.50")
    .refine((v) => Number(v) > 0, "The reward must be greater than 0"),
  tokenId: z.string().uuid("Choose a reward token"),
  isBoosted: z.boolean().optional(),
  validationChecklist: z
    .array(z.string().trim().min(1).max(L.checklistLength))
    .max(L.checklistItems)
    .optional(),
  checklistProofRequired: z.array(z.string().trim().min(1).max(L.checklistLength)).max(L.checklistItems).optional(),
  // Acepta el valor de <input type="datetime-local"> o un ISO; la salida
  // siempre es ISO con offset (lo que guarda el servidor). Nunca mandes al
  // servidor el valor crudo de datetime-local: se interpretaría en SU zona horaria.
  deadline: z
    .string()
    .min(1, "Pick a deadline")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date")
    .refine((v) => Date.parse(v) > Date.now(), "The deadline must be in the future")
    .transform((v) => new Date(v).toISOString()),
  milestones: z
    .array(z.string().trim().min(1).max(L.milestoneLength))
    .min(1, "Add at least one milestone")
    .max(L.milestoneItems),

  // Reglas del proceso (0 en maxParticipants = sin límite). Sin `.default()`:
  // los defaults los pone la tabla (ver QUEST_DEFAULTS), así `.partial()` en el
  // update nunca rellena valores y pisa los existentes.
  maxParticipants: int("a number of participants (0 = no limit)", 0, L.maxParticipants).optional(),
  submitWindowHours: int("the submission window", L.submitWindowHours.min, L.submitWindowHours.max).optional(),
  reviewWindowHours: int("the review window", L.reviewWindowHours.min, L.reviewWindowHours.max).optional(),
  maxAttempts: int("the attempts", L.maxAttempts.min, L.maxAttempts.max).optional(),
});

/**
 * NUEVO · Schema de CREACIÓN: base + reglas entre campos (deadline ↔ ventanas).
 * Solo los `error` de `timingIssues` entran aquí; los `warning` son de UI.
 * El refinamiento corre una vez que los campos individuales son válidos.
 */
export const createQuestSchema = createQuestBase.superRefine((v, ctx) => {
  for (const issue of timingIssues(v)) {
    if (issue.severity !== "error") continue;
    ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message });
  }
});

// CAMBIO · usa la base (un schema con superRefine ya no se comporta como objeto).
// Las reglas de tiempo se aplican en el servicio sobre el quest YA MEZCLADO
// (existente + cambios): ver `timingIssues`.
export const updateQuestSchema = z.object({
  id: z.string().uuid(),
  data: createQuestBase.partial(),
});

export const questIdSchema = z.object({ id: z.string().uuid() });

// El wizard envía { id, txHash }. Si el servidor deduce `chainId` de la quest,
// déjalo opcional; si no, el cliente debe mandarlo.
export const confirmQuestSchema = z.object({
  id: z.string().uuid(),
  chainId: z.number().int().positive().optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const listQuestsSchema = z.object({
  status: questStatusSchema.exclude(["DRAFT"]).optional(),
  chainId: z.number().int().positive().optional(),
  tokenId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

export const mineQuestsSchema = listQuestsSchema
  .pick({ limit: true, cursor: true })
  .extend({ status: questStatusSchema.optional() });

/* ---- Estado del formulario (strings no nulos para inputs controlados) ---- */

export interface QuestFormValues {
  title: string;
  description: string;
  category: string;
  tokenId: string;
  rewardAmount: string;
  deadline: string; // datetime-local
  isBoosted: boolean;
  milestones: string[];
  criteria: string;
  validationChecklist: string[];
  checklistProofRequired: string[];
  maxParticipants: number;
  submitWindowHours: number;
  reviewWindowHours: number;
  maxAttempts: number;
}

export const EMPTY_QUEST_FORM: QuestFormValues = {
  title: "",
  description: "",
  category: "",
  tokenId: "",
  rewardAmount: "",
  deadline: "",
  isBoosted: false,
  milestones: [],
  criteria: "",
  validationChecklist: [],
  checklistProofRequired: [],
  // Mismos defaults que la tabla `quests`.
  ...QUEST_DEFAULTS,
};