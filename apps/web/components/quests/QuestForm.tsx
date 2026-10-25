'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import type { CreateQuestInput } from '@perkify/db';
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import Field from '@/components/Field';
import { questFormSchema, EMPTY_QUEST_FORM, type QuestFormValues } from '@/lib/validations/quest';

export default function QuestForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (d: CreateQuestInput) => Promise<void>;
}) {
  const [f, setF] = useState<QuestFormValues>(EMPTY_QUEST_FORM);
  const [item, setItem] = useState('');
  const [milestone, setMilestone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { tokens, isLoading, isConnected, error: tokensError } = useAcceptedTokens();

  const set = (p: Partial<QuestFormValues>) => setF((s) => ({ ...s, ...p }));
  const token = tokens.find((t) => t.id === f.tokenId);

  const addItem = () => {
    if (!item.trim()) return;
    set({ validationChecklist: [...f.validationChecklist, item.trim()] });
    setItem('');
  };

  const addMilestone = () => {
    if (!milestone.trim()) return;
    set({ milestones: [...f.milestones, milestone.trim()] });
    setMilestone('');
  };

  const submit = async () => {
    const result = questFormSchema(token?.decimals ?? 18).safeParse(f);
    if (!result.success) return setErr(result.error.issues[0].message);

    const d = result.data;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({
        ...d,
        category: d.category || null,
        criteria: d.criteria || null,
        deadline: new Date(d.deadline).toISOString(),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error saving the quest.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-4 p-6">
      <Field label="Title">
        <input
          className="input"
          maxLength={120}
          value={f.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>

      <Field label="Description">
        <textarea
          className="input min-h-28"
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>

      <Field label="Reward token">
        {!isConnected && <p className="muted-2 text-sm">Connect your wallet to see the accepted tokens.</p>}
        {isConnected && isLoading && <p className="muted-2 text-sm">Loading tokens…</p>}
        {tokensError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{tokensError}</p>}
        {tokens.length > 0 && (
          <select className="input" value={f.tokenId} onChange={(e) => set({ tokenId: e.target.value })}>
            <option value="" disabled>Choose a token</option>
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
        </Field>
        <Field label="Deadline">
          <input
            className="input"
            type="datetime-local"
            value={f.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
          />
        </Field>
      </div>

      <div>
        <span className="muted mb-1 block text-sm font-medium">Expected milestones</span>
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
        <input
          className="input"
          maxLength={60}
          value={f.category}
          onChange={(e) => set({ category: e.target.value })}
        />
      </Field>

      <Field label="Acceptance criteria (optional)">
        <textarea
          className="input min-h-20"
          value={f.criteria}
          onChange={(e) => set({ criteria: e.target.value })}
        />
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
                onClick={() =>
                  set({ validationChecklist: f.validationChecklist.filter((_, j) => j !== i) })
                }
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