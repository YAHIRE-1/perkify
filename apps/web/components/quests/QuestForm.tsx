'use client';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import type { Quest, CreateQuestInput } from '@perkify/db';
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import { toLocalInput } from '@/lib/format';
import Field from '@/components/Field';

type FormState = {
  title: string;
  description: string;
  category: string;
  criteria: string;
  rewardAmount: string;
  deadline: string; // datetime-local
  tokenId: string;
  validationChecklist: string[];
  milestones: string[];
};

const MIN_DEADLINE_MS = 65 * 60 * 1000; // la API exige >= 1 h; margen de 5 min

function parseReward(value: string, decimals: number): bigint | null {
  if (!/^\d{1,18}(\.\d+)?$/.test(value)) return null;
  if ((value.split('.')[1] ?? '').length > decimals) return null;
  try {
    const n = parseUnits(value, decimals);
    return n > BigInt(0) ? n : null;
  } catch {
    return null;
  }
}

export default function QuestForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Quest;
  submitLabel: string;
  onSubmit: (d: CreateQuestInput) => Promise<void>;
}) {
  const [f, setF] = useState<FormState>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    criteria: initial?.criteria ?? '',
    rewardAmount: initial?.rewardAmount ? initial.rewardAmount.replace(/\.?0+$/, '') : '',
    deadline: initial?.deadline ? toLocalInput(initial.deadline) : '',
    tokenId: initial?.tokenId ?? '',
    validationChecklist: initial?.validationChecklist ?? [],
    milestones: initial?.milestones?.slice().sort((a, b) => a.position - b.position).map((m) => m.description) ?? [],
  });
  const [item, setItem] = useState('');
  const [milestone, setMilestone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { tokens, isLoading, isConnected, error: tokensError } = useAcceptedTokens();
  const set = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }));

  // ---- DEBUG: resumen del estado de tokens (solo imprime cuando cambia) ----
  const tokensSummary = JSON.stringify({
    isConnected,
    isLoading,
    tokensError,
    tokens: tokens.map((t) => `${t.symbol}@${t.chainId} balance=${t.balance?.toString() ?? 'null'}`),
  });
  useEffect(() => {
    console.log('[tokens]', tokensSummary);
  }, [tokensSummary]);

  const token = tokens.find((t) => t.id === f.tokenId);
  const reward = token ? parseReward(f.rewardAmount, token.decimals) : null;
  const lowBalance =
    !!token && token.balance !== null && reward !== null && reward > token.balance;

  const minDeadline = useMemo(() => toLocalInput(new Date(Date.now() + MIN_DEADLINE_MS).toISOString()), []);

  const addItem = () => {
    if (!item.trim() || f.validationChecklist.length >= 20) return;
    set({ validationChecklist: [...f.validationChecklist, item.trim()] });
    setItem('');
  };
  const addMilestone = () => {
    if (!milestone.trim() || f.milestones.length >= 20) return;
    set({ milestones: [...f.milestones, milestone.trim()] });
    setMilestone('');
  };

  const validate = (): string | null => {
    const title = f.title.trim();
    if (title.length < 5) return 'The title needs at least 5 characters.';
    if (title.length > 120) return 'The title cannot exceed 120 characters.';
    if (f.description.trim().length < 20) return 'The description needs at least 20 characters.';
    if (!f.tokenId) return 'Choose the reward token.';
    if (token) {
      if (!parseReward(f.rewardAmount, token.decimals)) {
        return `Enter a reward greater than 0 with at most ${token.decimals} decimals.`;
      }
    } else if (!initial || f.tokenId !== initial.tokenId) {
      return 'Choose the reward token.';
    }
    if (!f.deadline) return 'Select a deadline.';
    const d = new Date(f.deadline);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() + 60 * 60 * 1000) {
      return 'The deadline must be at least 1 hour from now.';
    }
    if (f.milestones.length === 0) return 'Add at least one expected milestone.';
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) return setErr(v);
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuestInput = {
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category.trim() || null,
        criteria: f.criteria.trim() || null,
        rewardAmount: f.rewardAmount,
        tokenId: f.tokenId,
        validationChecklist: f.validationChecklist,
        deadline: new Date(f.deadline).toISOString(),
        milestones: f.milestones,
      };
      await onSubmit(payload);
    } catch (e) {
      console.error('[QuestForm] submit → error', e);
      setErr(e instanceof Error ? e.message : 'Error saving the quest.');
    } finally {
      setBusy(false);
    }
  };

  // En edición, el token actual puede ser de otra chain que la de la wallet: se muestra igual.
  const currentMissing = !!initial && !tokens.some((t) => t.id === initial.tokenId);

  return (
    <div className="surface space-y-4 p-6">
      <Field label="Title">
        <input className="input" maxLength={120} value={f.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Description">
        <textarea className="input min-h-28" value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>

      <Field label="Reward token">
        {!isConnected && !currentMissing && (
          <p className="muted-2 text-sm">Connect your wallet to see the tokens accepted on your network.</p>
        )}
        {isConnected && isLoading && <p className="muted-2 text-sm">Loading tokens…</p>}
        {tokensError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{tokensError}</p>}
        {isConnected && !isLoading && !tokensError && tokens.length === 0 && (
          <p className="muted-2 text-sm">No accepted tokens on this network. Switch to Arbitrum or Arbitrum Sepolia.</p>
        )}
        {(tokens.length > 0 || currentMissing) && (
          <select
            className="input"
            value={f.tokenId}
            onChange={(e) => set({ tokenId: e.target.value })}
          >
            <option value="" disabled>Choose a token</option>
            {currentMissing && initial && (
              <option value={initial.tokenId}>{initial.acceptedTokenSymbol} (current)</option>
            )}
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
                {t.balance !== null ? ` — balance: ${formatUnits(t.balance, t.decimals)}` : ''}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reward amount">
          <input
            className="input"
            inputMode="decimal"
            placeholder="25.50"
            value={f.rewardAmount}
            onChange={(e) => set({ rewardAmount: e.target.value.trim() })}
          />
          {lowBalance && token && token.balance !== null && (
            <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
              More than your balance ({formatUnits(token.balance, token.decimals)} {token.symbol}). You can
              save the draft, but you’ll need the full amount to fund it.
            </p>
          )}
        </Field>
        <Field label="Deadline">
          <input
            className="input"
            type="datetime-local"
            min={minDeadline}
            value={f.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
          />
        </Field>
      </div>

      <div>
        <span className="muted mb-1 block text-sm font-medium">Expected milestones</span>
        <p className="muted-2 mb-2 text-xs">
          Milestones are part of the reward agreement. You can edit them while the quest is a draft;
          once you start funding it they are locked.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            value={milestone}
            placeholder="E.g.: Post on X with the hashtag…"
            onChange={(e) => setMilestone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMilestone();
              }
            }}
          />
          <button type="button" className="btn" onClick={addMilestone}>Add</button>
        </div>
        <ul className="mt-2 space-y-1">
          {f.milestones.map((m, i) => (
            <li key={i} className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>{i + 1}. {m}</span>
              <button
                type="button"
                className="muted-2 text-xs"
                onClick={() => set({ milestones: f.milestones.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Field label="Category (optional)">
        <input className="input" maxLength={60} value={f.category} onChange={(e) => set({ category: e.target.value })} />
      </Field>
      <Field label="Acceptance criteria (optional)">
        <textarea className="input min-h-20" value={f.criteria} onChange={(e) => set({ criteria: e.target.value })} />
      </Field>

      <div>
        <span className="muted mb-1 block text-sm font-medium">Validation checklist (optional)</span>
        <div className="flex gap-2">
          <input
            className="input"
            value={item}
            placeholder="Add a point to validate"
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <button type="button" className="btn" onClick={addItem}>Add</button>
        </div>
        <ul className="mt-2 space-y-1">
          {f.validationChecklist.map((c, i) => (
            <li key={i} className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm">
              {c}
              <button
                type="button"
                className="muted-2 text-xs"
                onClick={() => set({ validationChecklist: f.validationChecklist.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
      <button className="btn btn-primary" disabled={busy} onClick={submit}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}