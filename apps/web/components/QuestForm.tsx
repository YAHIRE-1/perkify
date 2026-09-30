'use client';
import { useState, useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';
import type { Quest, QuestMilestone, QuestToken } from '@/collections/schemas/Quest';
import { useWalletTokens } from '@/hooks/useWalletTokens';
import Field from './Field';

type FormState = Partial<Quest> & {
  checklist: string[];
  milestones: QuestMilestone[];
};

export default function QuestForm({
  initial,
  submitLabel,
  onSubmit,
  onBusyMessage,
}: {
  initial?: Partial<Quest>;
  submitLabel: string;
  onSubmit: (d: Record<string, unknown>) => Promise<void>;
  onBusyMessage?: (msg: string) => void;
}) {
  const isEditing = Boolean(initial?.id);
  const [f, setF] = useState<FormState>({ checklist: [], milestones: [], ...initial });
  const [item, setItem] = useState('');
  const [milestone, setMilestone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('Saving…');


  const { tokens, isLoading: loadingTokens, isConnected } = useWalletTokens();

  const set = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }));

  const addItem = () => {
    if (item.trim()) {
      set({ checklist: [...f.checklist, item.trim()] });
      setItem('');
    }
  };

  const addMilestone = () => {
    if (!milestone.trim() || isEditing) return;
    const m: QuestMilestone = { id: crypto.randomUUID(), description: milestone.trim() };
    set({ milestones: [...f.milestones, m] });
    setMilestone('');
  };

  const removeMilestone = (id: string) => {
    if (isEditing) return;
    set({ milestones: f.milestones.filter((m) => m.id !== id) });
  };

  const selectedTokenBalance = useMemo(
    () => tokens.find((t) => t.address === f.token?.address)?.balance ?? null,
    [tokens, f.token],
  );

  const insufficientBalance = useMemo(() => {
    if (!f.token || selectedTokenBalance === null || !f.reward) return false;
    try {
      const rewardWei = parseUnits(f.reward, f.token.decimals);
      return rewardWei > selectedTokenBalance;
    } catch {
      return false;
    }
  }, [f.token, f.reward, selectedTokenBalance]);

  // --- LOCAL VALIDATION ---
  const validateForm = (): string | null => {
    if (!f.title || !f.title.trim()) {
      return 'Title is required.';
    }
    if (f.title.trim().length > 120) {
      return 'Title cannot exceed 120 characters.';
    }
    if (!f.description || !f.description.trim()) {
      return 'Description is required.';
    }
    if (!f.reward || isNaN(Number(f.reward)) || Number(f.reward) <= 0) {
      return 'Enter a valid reward amount greater than 0.';
    }
    if (!f.token) {
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
    if (!isEditing && (!f.milestones || f.milestones.length === 0)) {
      return 'You must add at least one expected milestone.';
    }
    return null; // No errors
  };

  const submit = async () => {
    // 1. Validate fields
    const validationError = validateForm();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      // 2. Map explicitly to the properties expected by TypeORM / NestJS
      const payload = {
        ...(isEditing ? { id: f.id } : {}),
        title: f.title!.trim(),
        description: f.description!.trim(),
        rewardAmount: f.reward, // <--- matches TypeORM
        acceptedTokenSymbol: f.token!.symbol, // <--- matches TypeORM
        acceptedTokenAddress: f.token!.address, // <--- matches TypeORM
        deadline: new Date(f.deadline!).toISOString(), // convert date format to ISO
        milestones: f.milestones,
        validationChecklist: f.checklist,
      };

      // We don't handle the pipeline here because onSubmit is defined in the page
      // But we can't update busyMessage from outside.
      // Let's move the pipeline logic into the form or pass a setter.
      // For a quick fix, we'll keep it as is but since I can't change the page's
      // onSubmit easily without adding props, I'll move the logic here.

      await onSubmit(payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error saving quest');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy && !!f.title && !!f.token && !insufficientBalance && (isEditing || f.milestones.length > 0);

  return (
    <div className="surface space-y-4 p-6">
      <Field label="Title">
        <input className="input" value={f.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Description">
        <textarea className="input min-h-28" value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reward">
          <input className="input" type="number" min="0" step="any" value={f.reward ?? ''} onChange={(e) => set({ reward: e.target.value })} />
          {insufficientBalance && (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
              Exceeds your {f.token?.symbol} balance
              {selectedTokenBalance !== null && f.token && ` (you have ${formatUnits(selectedTokenBalance, f.token.decimals)})`}
            </p>
          )}
        </Field>
        <Field label="Deadline">
          <input className="input" type="date" value={f.deadline?.slice(0, 10) ?? ''} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
      </div>

      <Field label="Accepted token">
        {!isConnected && <p className="muted-2 text-sm">Connect your wallet to see your tokens.</p>}
        {isConnected && loadingTokens && <p className="muted-2 text-sm">Loading balances…</p>}
        {isConnected && !loadingTokens && tokens.length === 0 && (
          <p className="muted-2 text-sm">No balance found in supported tokens.</p>
        )}
        {isConnected && tokens.length > 0 && (
          <select
            className="input"
            disabled={isEditing}
            value={f.token?.address ?? ''}
            onChange={(e) => {
              const t = tokens.find((tk) => tk.address === e.target.value);
              set({ token: t ? { address: t.address, symbol: t.symbol, decimals: t.decimals } : undefined });
            }}
          >
            <option value="" disabled>Choose a token</option>
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol} — balance: {formatUnits(t.balance, t.decimals)}
              </option>
            ))}
          </select>
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
          {f.milestones.map((m) => (
            <li key={m.id} className="surface-2 flex items-center justify-between px-3 py-2 text-sm">
              {m.description}
              {!isEditing && (
                <button className="muted-2 text-xs" onClick={() => removeMilestone(m.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
        {isEditing && f.milestones.length === 0 && (
          <p className="muted-2 text-xs mt-1">This quest has no milestones defined.</p>
        )}
      </div>

      <Field label="Category">
        <input className="input" value={f.category ?? ''} onChange={(e) => set({ category: e.target.value })} />
      </Field>
      <Field label="Acceptance criteria">
        <textarea className="input min-h-20" value={f.criteria ?? ''} onChange={(e) => set({ criteria: e.target.value })} />
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
          {f.checklist.map((c, i) => (
            <li key={i} className="surface-2 flex items-center justify-between px-3 py-2 text-sm">
              {c}
              <button className="muted-2 text-xs" onClick={() => set({ checklist: f.checklist.filter((_, j) => j !== i) })}>Remove</button>
            </li>
          ))}
        </ul>
      </div>

      {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
      <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
        {busy ? busyMessage : submitLabel}
      </button>
    </div>
  );
}