'use client';
import { Translate } from '@/lib/i18n/provider';

import { useEffect, useMemo, useRef, useState } from 'react';
import { revalidateLogic, useForm, useStore } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { erc20Abi } from 'viem';
import { useAccount, useConfig } from 'wagmi';
import {
  readContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import { questEscrowAbi } from '@perkify/contracts';
import { Button } from '@perkify/ui/components/button';
import { Form } from '@perkify/ui/components/form';
import { authClient } from '@/lib/auth-client';
import { useConfirmQuest, useCreateQuest } from '@/hooks/quest/use-quest';
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import { EMPTY_QUEST_FORM, parseDeadline, type QuestFormValues } from '@perkify/db/validations/quest';
import {
  clearFormDraft,
  draftKey,
  evaluateQuest,
  fieldsUpTo,
  firstStepWithError,
  groupIssuesByStep,
  isMeaningfulDraft,
  issuesByField,
  loadFormDraft,
  parseWalletError,
  saveFormDraft,
} from './quest-logic';
import { BasicsStep, RewardStep, TasksStep, TimingStep } from './quest-steps';
import {
  FundingProgress,
  QuestPreview,
  QuestStepper,
  ReviewIssues,
  TransactionSummary,
  type StepStatus,
} from './quest-preview';

/* -------------------------------------------------------------------------- */
/*  Definición de pasos: cada uno declara qué campos valida                   */
/*  Schedule junta ventanas, deadline, intentos y participantes: son campos   */
/*  que dependen unos de otros y el usuario debe verlos a la vez.             */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    id: 'basics',
    title: 'Quest details',
    description: 'Explain what you need and give hunters enough context to get started.',
    fields: ['title', 'description', 'category'],
  },
  {
    id: 'tasks',
    title: 'Deliverables',
    description: 'Describe what hunters should submit and how you’ll review their work.',
    fields: ['milestones', 'criteria', 'validationChecklist'],
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Set a closing date and check how much time hunters will have.',
    fields: [
      'submitWindowHours',
      'reviewWindowHours',
      'maxAttempts',
      'deadline',
      'maxParticipants',
    ],
  },
  {
    id: 'reward',
    title: 'Reward',
    description: 'Set the reward you’ll deposit in escrow.',
    fields: ['tokenId', 'rewardAmount', 'isBoosted'],
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Check what hunters will see and confirm your escrow deposit.',
    fields: [],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  description: string;
  fields: readonly (keyof QuestFormValues)[];
}[];

const LAST = STEPS.length - 1;
// Local drafts store the original step positions.
const DRAFT_STEP_ORDER = [0, 2, 3, 1, 4];

/* -------------------------------------------------------------------------- */
/*  Fondeo on-chain                                                           */
/* -------------------------------------------------------------------------- */

type Step = 'idle' | 'creating' | 'switching' | 'approving' | 'depositing' | 'confirming';

const STEP_LABEL: Record<Step, string> = {
  idle: 'Fund and publish',
  creating: 'Creating draft…',
  switching: 'Switching network…',
  approving: 'Approve the token in your wallet…',
  depositing: 'Confirm the deposit in your wallet…',
  confirming: 'Verifying on-chain…',
};

const WALLET_MISMATCH_MESSAGE =
  'The connected wallet differs from the one you signed in with. Switch accounts in your wallet.';

// createQuest(token, reward, deadline, uri)
interface EscrowParams {
  chainId: number;
  escrowAddress: `0x${string}`;
  args: { token: `0x${string}`; reward: string; deadline: number; uri: string };
}

// Borrador ya creado: permite reintentar sin crear otro.
interface Pending {
  questId: string;
  escrow: EscrowParams;
  txHash?: `0x${string}`;
}

/** Re-renderiza cada minuto para que el calendario y los mínimos de fecha no queden viejos. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* -------------------------------------------------------------------------- */
/*  Wizard                                                                    */
/* -------------------------------------------------------------------------- */

export default function QuestWizard() {
  const router = useRouter();
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const { data: session } = authClient.useSession();
  const createQuest = useCreateQuest();
  const confirmQuest = useConfirmQuest();
  const now = useNow();

  const [index, setIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  // El validador del formulario lee el paso actual de aquí (se actualiza al instante).
  const indexRef = useRef(0);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  // Con borrador creado se bloquea la edición: el reintento reutiliza el borrador.
  const [hasDraft, setHasDraft] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const pending = useRef<Pending | null>(null);

  const { tokens, isLoading, isConnected, error: tokensError } = useAcceptedTokens();

  // Feedback temprano; la autoridad real es el servidor.
  const sessionWallet = session?.user.walletAddress;
  const walletMismatch =
    !!address && !!sessionWallet && address.toLowerCase() !== sessionWallet.toLowerCase();

  const goToQuests = () => router.push('/dashboard');

  /** Cambia de paso y recuerda hasta dónde ha llegado el usuario. */
  const show = (i: number) => {
    indexRef.current = i;
    setIndex(i);
    setMaxReached((m) => Math.max(m, i));
  };

  /* ---- fondeo: se puede reanudar desde donde falló ---- */
  const fund = async (p: Pending) => {
    if (!address) throw new Error('Connect your wallet first.');
    const { escrow } = p;
    const chainId = escrow.chainId as (typeof config.chains)[number]['id'];
    const amount = BigInt(escrow.args.reward);

    if (!p.txHash) {
      if (walletChainId !== escrow.chainId) {
        setStep('switching');
        await switchChain(config, { chainId });
      }

      const allowance = await readContract(config, {
        address: escrow.args.token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, escrow.escrowAddress],
        chainId,
      });

      if (allowance < amount) {
        setStep('approving');
        const approveHash = await writeContract(config, {
          address: escrow.args.token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [escrow.escrowAddress, amount],
          chainId,
        });
        const approveReceipt = await waitForTransactionReceipt(config, {
          hash: approveHash,
          chainId,
        });
        if (approveReceipt.status !== 'success') throw new Error('Approval failed.');
      }

      setStep('depositing');
      p.txHash = await writeContract(config, {
        address: escrow.escrowAddress,
        abi: questEscrowAbi,
        functionName: 'createQuest',
        args: [escrow.args.token, amount, BigInt(escrow.args.deadline), escrow.args.uri],
        chainId,
      });
    }

    setStep('confirming');
    const receipt = await waitForTransactionReceipt(config, { hash: p.txHash, chainId });
    if (receipt.status !== 'success') {
      p.txHash = undefined; // la tx revirtió: el reintento vuelve a depositar
      throw new Error('The deposit transaction failed.');
    }

    await confirmQuest.mutateAsync({ id: p.questId, txHash: p.txHash });
    pending.current = null;
    setHasDraft(false);
  };

  /* ---- formulario ---- */
  const evaluate = (value: QuestFormValues) => evaluateQuest(value, tokens);

  // Borrador local: una clave por usuario/wallet.
  const ownerKey = sessionWallet ?? address;
  const storageKey = ownerKey ? draftKey(ownerKey) : null;
  const [formDefaults, setFormDefaults] = useState(EMPTY_QUEST_FORM);

  const form = useForm({
    defaultValues: formDefaults,
    // Valida al salir de cada campo; tras el primer envío, en cada cambio.
    validationLogic: revalidateLogic({ mode: 'blur', modeAfterSubmission: 'change' }),
    validators: {
      // Solo reporta errores de los pasos ya alcanzados.
      onDynamic: ({ value }) => {
        const fields = issuesByField(evaluate(value).issues, {
          allowed: fieldsUpTo(STEPS, indexRef.current),
        });
        return Object.keys(fields).length ? { fields } : undefined;
      },
    },
    onSubmit: async ({ value }) => {
      const { data: d, issues } = evaluate(value);
      if (!d) {
        // Raro (p. ej. el deadline venció mientras revisabas): vuelve al primer paso con error.
        const first = firstStepWithError(STEPS, issues);
        if (first >= 0) show(first);
        return;
      }

      setErr(null);
      if (!address) return setErr('Connect your wallet first.');
      if (walletMismatch) return setErr(WALLET_MISMATCH_MESSAGE);

      try {
        if (!pending.current) {
          setStep('creating');
          // `d` ya viene con trim y el deadline convertido a ISO por el schema.
          const created = await createQuest.mutateAsync({
            ...d,
            category: d.category || null,
            criteria: d.criteria || null,
          });
          pending.current = {
            questId: created.quest.id,
            escrow: created.escrow as EscrowParams,
          };
          setHasDraft(true);
        }

        await fund(pending.current);
        if (storageKey) clearFormDraft(storageKey);
        goToQuests();
      } catch (e) {
        setErr(parseWalletError(e).message);
      } finally {
        setStep('idle');
      }
    },
  });

  // Valores en vivo: el calendario, el stepper y la revisión se actualizan al escribir.
  const values = useStore(form.store, (s) => s.values);
  const setValue = <K extends keyof QuestFormValues>(name: K, value: QuestFormValues[K]) =>
    form.setFieldValue(name as never, value as never);

  const evaluation = useMemo(() => evaluateQuest(values, tokens, now), [values, tokens, now]);
  const submitting = step !== 'idle';
  const isReview = index === LAST;
  const current = STEPS[index];
  const token = tokens.find((t) => t.id === values.tokenId);

  const fundingChainId = pending.current?.escrow.chainId ?? token?.chainId;
  const fundingNetwork = config.chains.find((item) => item.id === fundingChainId)?.name;
  const deadline = parseDeadline(values.deadline);

  /* ---- estado de cada paso para el stepper ---- */
  const errorFields = new Set(
    evaluation.issues.filter((i) => i.severity === 'error').map((i) => i.field),
  );
  const statuses: StepStatus[] = STEPS.map((s, i) => {
    if (i === index) return 'current';
    if (i > maxReached || i === LAST) return 'todo';
    return s.fields.some((f) => errorFields.has(f)) ? 'error' : 'done';
  });

  /* ---- navegación ---- */

  // Lleva el foco al primer campo con error del paso visible.
  const focusFirstError = () =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          'section:not([hidden]) [aria-invalid="true"]',
        );
        const settings = el?.closest('details');
        if (settings) settings.open = true;
        el?.focus();
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }),
    );

  const stepBlocked = (i: number) =>
    Object.keys(
      issuesByField(evaluation.issues, { allowed: new Set<string>(STEPS[i].fields) }),
    ).length > 0;

  const next = async () => {
    if (stepBlocked(index)) {
      // Muestra los mensajes en los campos del paso actual y lleva el foco al primero.
      await form.validate('submit');
      focusFirstError();
      return;
    }
    show(Math.min(index + 1, LAST));
  };

  const back = () => show(Math.max(index - 1, 0));

  // Hacia atrás siempre; hacia adelante solo si los pasos intermedios son válidos
  // (el usuario pudo invalidar algo al volver a editar).
  const goTo = async (target: number) => {
    if (target === index) return;
    if (target < index) return show(target);
    for (let i = index; i < target; i++) {
      if (stepBlocked(i)) {
        show(i);
        await form.validate('submit');
        focusFirstError();
        return;
      }
    }
    show(target);
  };

  // Al cambiar de paso: baja/sube al encabezado y lo anuncia a lectores de pantalla.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  /* ---- borrador local: guardar solo, ofrecer retomarlo al volver ---- */
  const [restorable, setRestorable] = useState<ReturnType<typeof loadFormDraft>>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const checkedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!storageKey || checkedKey.current === storageKey) return;
    checkedKey.current = storageKey;
    const d = loadFormDraft(storageKey);
    if (d && isMeaningfulDraft(d.values)) setRestorable(d);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || restorable || hasDraft || submitting) return;
    if (!isMeaningfulDraft(values)) return;
    const t = setTimeout(() => {
      saveFormDraft(storageKey, values, DRAFT_STEP_ORDER[indexRef.current]);
      setSavedAt(new Date());
    }, 800);
    return () => clearTimeout(t);
  }, [values, index, storageKey, restorable, hasDraft, submitting]);

  const restoreDraft = () => {
    if (!restorable) return;
    // Keep the next render's defaults aligned with the restored form.
    setFormDefaults(restorable.values);
    form.reset(restorable.values);
    const restoredIndex = Math.max(0, DRAFT_STEP_ORDER.indexOf(restorable.step));
    const firstInvalid = firstStepWithError(STEPS, evaluate(restorable.values).issues);
    const i = firstInvalid >= 0 ? Math.min(restoredIndex, firstInvalid) : restoredIndex;
    indexRef.current = i;
    setIndex(i);
    setMaxReached(i);
    setSavedAt(restorable.savedAt);
    setRestorable(null);
    if (i === index) {
      requestAnimationFrame(() => {
        headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        headingRef.current?.focus({ preventScroll: true });
      });
    }
  };

  const discardDraft = () => {
    if (storageKey) clearFormDraft(storageKey);
    setRestorable(null);
  };

  // Mientras se firma, avisar antes de cerrar la pestaña.
  useEffect(() => {
    if (!submitting) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [submitting]);

  /* ---- revisión ---- */
  const issueGroups = isReview ? groupIssuesByStep(STEPS, evaluation.issues) : [];
  const warnings = isReview
    ? [...new Set(evaluation.issues.filter((i) => i.severity === 'warning').map((i) => i.message))]
    : [];

  // Borrador ya creado en el servidor pero ya no cumple las reglas (p. ej. venció el deadline).
  const startNewDraft = () => {
    pending.current = null;
    setHasDraft(false);
    setErr(null);
    setAcknowledged(false);
  };

  const canSubmit =
    !submitting &&
    !walletMismatch &&
    evaluation.data !== null &&
    (hasDraft || acknowledged);

  return (
    <Form form={form}>
      <form
        className="flex min-h-full flex-col [&_[data-slot=label]:not(.text-destructive)]:text-[color:var(--accent-text)]"
        onSubmit={(event) => {
          event.preventDefault();
          // Enter en un input intermedio avanza de paso; solo la revisión envía.
          if (isReview) {
            if (canSubmit) form.handleSubmit();
          } else next();
        }}
      >
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
          <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}><Translate text={"Create a quest"} /></h1>
            <span aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {savedAt && !hasDraft && <><Check aria-hidden className="size-3.5" />{' '}<Translate text={"Saved on this device"} /></>}
            </span>
          </header>
          <div className="surface sticky top-12 z-10 mb-5 px-4 py-3 sm:px-5 md:static">
              <QuestStepper
                current={index}
                disabled={submitting || hasDraft}
                maxReached={maxReached}
                onSelect={goTo}
                statuses={statuses}
                steps={STEPS}
              />
          </div>

            {restorable && (
              <div
                className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                role="status"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium"><Translate text={"Welcome back: you have an unfinished quest"} /></p>
                  <p className="text-xs text-muted-foreground"><Translate text={"Saved"} />{' '}{restorable.savedAt.toLocaleString()}
                    {restorable.values.title.trim() ? `: “${restorable.values.title.trim()}”` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="legacy" onClick={discardDraft}><Translate text={"Start fresh"} /></Button>
                  <Button type="button" variant="legacy-primary" onClick={restoreDraft}><Translate text={"Continue draft"} /></Button>
                </div>
              </div>
            )}

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-5">
              <div className="surface grid gap-5 p-5 sm:p-7">
                <div className="space-y-1">
                  <p aria-live="polite" className="sr-only"><Translate text={"Step {step} of {total}"} values={{ step: index + 1, total: STEPS.length }} />: <Translate text={current.title} />
                  </p>
                  <h2
                    ref={headingRef}
                    className="scroll-mt-24 text-2xl font-semibold tracking-tight outline-none"
                    tabIndex={-1}
                  >
                    <Translate text={current.title} />
                  </h2>
                  <p className="text-sm text-muted-foreground"><Translate text={current.description} /></p>
                </div>

                {walletMismatch && (
                  <p className="text-sm text-destructive" role="alert">
                    {WALLET_MISMATCH_MESSAGE}
                  </p>
                )}

                {/* Los pasos se ocultan (no se desmontan) para conservar su estado local. */}
                <section hidden={index !== 0}>
                  <BasicsStep />
                </section>
                <section hidden={index !== 1}>
                  <TasksStep />
                </section>
                <section hidden={index !== 2}>
                  <TimingStep issues={evaluation.issues} setValue={setValue} values={values} />
                </section>
                <section hidden={index !== 3}>
                  <RewardStep
                    isConnected={isConnected}
                    isLoading={isLoading}
                    networkName={fundingNetwork ?? config.chains.find((item) => item.id === walletChainId)?.name}
                    selectedToken={token}
                    tokens={tokens}
                    tokensError={tokensError}
                  />
                </section>

                {isReview && (
                  <div className="grid min-w-0 gap-4">
                    <ReviewIssues
                      groups={issueGroups}
                      locked={hasDraft}
                      onFix={show}
                      onStartOver={startNewDraft}
                      warnings={warnings}
                    />
                    <QuestPreview
                      onEdit={hasDraft || submitting ? undefined : show}
                      token={token}
                      values={values}
                    />
                  </div>
                )}

                {err && (
                  <p className="text-sm text-destructive" role="alert">
                    {err}
                    {hasDraft ? ' You can retry: the draft is kept.' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="grid min-w-0 gap-3 lg:sticky lg:top-16">
              {isReview ? (
                <>
                  <TransactionSummary
                    acknowledged={acknowledged}
                    locked={hasDraft || submitting}
                    networkName={fundingNetwork}
                    onAcknowledge={setAcknowledged}
                    token={token}
                    values={values}
                  />
                  <div className="hidden lg:block">
                    <Button className="w-full" disabled={!canSubmit} type="submit" variant="legacy-primary">
                      {submitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
                      <Translate text={STEP_LABEL[step]} />
                    </Button>
                  </div>
                  <FundingProgress step={step} />
                </>
              ) : (
                <details className="surface p-5 lg:hidden">
                  <summary className="cursor-pointer text-sm font-semibold"><Translate text={"View draft summary"} /></summary>
                  <div className="mt-3">
                    <DraftSummary values={values} tokenSymbol={token?.symbol} deadline={deadline} />
                  </div>
                </details>
              )}
              {!isReview && (
                <aside className="surface hidden space-y-4 p-5 lg:block">
                  <h2 className="text-sm font-semibold"><Translate text={"Draft summary"} /></h2>
                  <DraftSummary values={values} tokenSymbol={token?.symbol} deadline={deadline} />
                </aside>
              )}
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 border-t px-4 py-3 sm:px-8" style={{ background: 'var(--bg)' }}>
          <div className="mx-auto flex w-full max-w-6xl justify-between gap-4">
            <Button
              disabled={index === 0 || submitting || hasDraft}
              onClick={back}
              type="button"
              variant="legacy"
            ><Translate text={"Back"} /></Button>

            {isReview ? (
              <Button className="lg:hidden" disabled={!canSubmit} type="submit" variant="legacy-primary">
                {submitting ? <Loader2 className="animate-spin" /> : null}
                <Translate text={STEP_LABEL[step]} />
              </Button>
            ) : (
              <Button onClick={next} type="button" variant="legacy-primary"><Translate text={"Continue"} />{' '}<ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </footer>
      </form>
    </Form>
  );
}
function DraftSummary({ values, tokenSymbol, deadline }: {
  values: QuestFormValues;
  tokenSymbol?: string;
  deadline: Date | null;
}) {
  const title = values.title.trim();
  const deliverables = values.milestones.filter((item) => item.trim()).length;
  const reward = values.rewardAmount.trim();
  if (!title && !deliverables && !deadline && !(reward && tokenSymbol)) {
    return <p className="text-sm text-muted-foreground"><Translate text={"Your quest details will appear here as you fill them in."} /></p>;
  }

  return (
    <div className="space-y-3 text-sm">
      {title && <p className="break-words text-base font-semibold">{title}</p>}
      <dl className="space-y-2">
        {deliverables > 0 && <div><dt className="text-muted-foreground"><Translate text={"Deliverables"} /></dt><dd>{deliverables}</dd></div>}
        {deadline && <div><dt className="text-muted-foreground"><Translate text={"Closes"} /></dt><dd>{deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
        {reward && tokenSymbol && <div><dt className="text-muted-foreground"><Translate text={"Reward"} /></dt><dd>{reward} {tokenSymbol}</dd></div>}
      </dl>
    </div>
  );
}
