'use client';
import { useState, useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';
import type { Quest, CreateQuestInput } from '@perkify/db';
import { useWalletTokens } from '@/hooks/useWalletTokens';
import { NATIVE_TOKEN_ADDRESS } from '@/lib/knownTokens';
import Field from './Field';

type TokenChoice = { address: string; symbol: string; decimals: number };

type FormState = {
  title: string;
  description: string;
  category: string;
  criteria: string;
  rewardAmount: string;
  deadline: string;
  validationChecklist: string[];
  milestones: string[];
  token?: TokenChoice;
};

export default function QuestForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Quest;
  submitLabel: string;
  onSubmit: (d: CreateQuestInput) => Promise<void>;
}) {
  const isEditing = Boolean(initial?.id);
  const [f, setF] = useState<FormState>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    criteria: initial?.criteria ?? '',
    rewardAmount: initial?.rewardAmount ?? '',
    deadline: initial?.deadline?.slice(0, 10) ?? '',
    validationChecklist: initial?.validationChecklist ?? [],
    milestones: initial?.milestones?.map((m) => m.description) ?? [],
  });
  const [item, setItem] = useState('');
  const [milestone, setMilestone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    tokens,
    isLoading: loadingTokens,
    isConnected,
    isSupportedChain,
    error: tokensError,
  } = useWalletTokens();

  const set = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }));

  const addItem = () => {
    if (item.trim()) {
      set({ validationChecklist: [...f.validationChecklist, item.trim()] });
      setItem('');
    }
  };

  const addMilestone = () => {
    if (!milestone.trim() || isEditing) return;
    set({ milestones: [...f.milestones, milestone.trim()] });
    setMilestone('');
  };

  const removeMilestone = (index: number) => {
    if (isEditing) return;
    set({ milestones: f.milestones.filter((_, i) => i !== index) });
  };

  const selectedTokenBalance = useMemo(
    () => tokens.find((t) => t.address === f.token?.address)?.balance ?? null,
    [tokens, f.token],
  );

  const insufficientBalance = useMemo(() => {
    if (!f.token || selectedTokenBalance === null || !f.rewardAmount) return false;
    try {
      const rewardWei = parseUnits(f.rewardAmount, f.token.decimals);
      return rewardWei > selectedTokenBalance;
    } catch {
      return false;
    }
  }, [f.token, f.rewardAmount, selectedTokenBalance]);

  // --- LOCAL VALIDATION ---
  const validateForm = (): string | null => {
    if (!f.title.trim()) {
      return 'Title is required.';
    }
    if (f.title.trim().length > 120) {
      return 'Title cannot exceed 120 characters.';
    }
    if (!f.description.trim()) {
      return 'Description is required.';
    }
    if (!f.rewardAmount || isNaN(Number(f.rewardAmount)) || Number(f.rewardAmount) <= 0) {
      return 'Enter a valid reward amount greater than 0.';
    }
    if (!isEditing && !f.token) {
      return 'Choose a valid token for the reward.';
    }
    if (insufficientBalance) {
      return "You don't have enough balance of that token to cover the reward.";
    }
    if (!f.deadline) {
      return 'Select a deadline.';
    }
    const deadlineDate = new Date(f.deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return 'The deadline must be in the future.';
    }
    if (!isEditing && f.milestones.length === 0) {
      return 'You must add at least one expected milestone.';
    }
    return null;
  };

  const submit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      // Token y milestones solo se envían al crear (no son editables).
      // Si tokenAddress es NATIVE_TOKEN_ADDRESS (0x000...0), el pago es en ETH nativo.
      const payload = {
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category.trim() || null,
        criteria: f.criteria.trim() || null,
        rewardAmount: f.rewardAmount,
        deadline: new Date(f.deadline).toISOString(),
        validationChecklist: f.validationChecklist,
        ...(isEditing ? {} : { tokenAddress: f.token!.address, milestones: f.milestones }),
      } as CreateQuestInput;

      await onSubmit(payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error saving quest');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    !!f.title &&
    !insufficientBalance &&
    (isEditing || (!!f.token && f.milestones.length > 0));

  return (
    <div className="surface space-y-4 p-6">
      <Field label="Title">
        <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Description">
        <textarea className="input min-h-28" value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reward">
          <input className="input" type="number" min="0" step="any" value={f.rewardAmount} onChange={(e) => set({ rewardAmount: e.target.value })} />
          {insufficientBalance && (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
              Exceeds your {f.token?.symbol} balance
              {selectedTokenBalance !== null && f.token && ` (you have ${formatUnits(selectedTokenBalance, f.token.decimals)})`}
            </p>
          )}
        </Field>
        <Field label="Deadline">
          <input className="input" type="date" value={f.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
      </div>

      <Field label="Accepted token">
        {isEditing ? (
          <p className="muted text-sm">{initial?.acceptedTokenSymbol} (can't be changed)</p>
        ) : (
          <>
            {!isConnected && <p className="muted-2 text-sm">Connect your wallet to see your tokens.</p>}
            {isConnected && !isSupportedChain && (
              <p className="muted-2 text-sm">Switch to Arbitrum or Sepolia to see your tokens.</p>
            )}
            {isConnected && isSupportedChain && loadingTokens && (
              <p className="muted-2 text-sm">Loading balances…</p>
            )}
            {isConnected && isSupportedChain && !loadingTokens && tokensError && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                Couldn't read your balances. Try again in a moment.
              </p>
            )}
            {isConnected && isSupportedChain && !loadingTokens && !tokensError && tokens.length === 0 && (
              <p className="muted-2 text-sm">No ETH or USDC balance found on this network.</p>
            )}
            {isConnected && tokens.length > 0 && (
              <select
                className="input"
                value={f.token?.address ?? ''}
                onChange={(e) => {
                  const t = tokens.find((tk) => tk.address === e.target.value);
                  set({ token: t ? { address: t.address, symbol: t.symbol, decimals: t.decimals } : undefined });
                }}
              >
                <option value="" disabled>Choose a token</option>
                {tokens.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol}
                    {t.address === NATIVE_TOKEN_ADDRESS ? ' (native)' : ''} — balance: {formatUnits(t.balance, t.decimals)}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </Field>

      <div>
        <span className="muted mb-1 block text-sm font-medium">Expected milestones</span>
        <p className="muted-2 text-xs mb-2">
          These milestones are locked in once the quest is created and are part of the reward
          contract: any participant who proves they've been met can claim payment. They can't be
          edited after publishing.
        </p>
        {!isEditing && (
          <div className="flex gap-2">
            <input
              className="input"
              value={milestone}
              placeholder="E.g.: Post on X with the hashtag..."
              onChange={(e) => setMilestone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            />
            <button type="button" className="btn" onClick={addMilestone}>Add</button>
          </div>
        )}
        <ul className="mt-2 space-y-1">
          {f.milestones.map((m, i) => (
            <li key={i} className="surface-2 flex items-center justify-between px-3 py-2 text-sm">
              {m}
              {!isEditing && (
                <button type="button" className="muted-2 text-xs" onClick={() => removeMilestone(i)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
        {isEditing && f.milestones.length === 0 && (
          <p className="muted-2 text-xs mt-1">This quest has no milestones defined.</p>
        )}
      </div>

      <Field label="Category">
        <input className="input" value={f.category} onChange={(e) => set({ category: e.target.value })} />
      </Field>
      <Field label="Acceptance criteria">
        <textarea className="input min-h-20" value={f.criteria} onChange={(e) => set({ criteria: e.target.value })} />
      </Field>

      <div>
        <span className="muted mb-1 block text-sm font-medium">Validation checklist</span>
        <div className="flex gap-2">
          <input
            className="input"
            value={item}
            placeholder="Add a point to validate"
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <button type="button" className="btn" onClick={addItem}>Add</button>
        </div>
        <ul className="mt-2 space-y-1">
          {f.validationChecklist.map((c, i) => (
            <li key={i} className="surface-2 flex items-center justify-between px-3 py-2 text-sm">
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
      <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}