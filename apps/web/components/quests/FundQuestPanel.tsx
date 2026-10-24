'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import type { Quest } from '@perkify/db';
import { orpc, errorMessage } from '@/lib/orpc';
import { fmtAmount, fmtDate } from '@/lib/format';
import { useFundQuest, FUND_STEP_ORDER, type FundStep } from '@/hooks/useFundQuest';

const STEPS: { key: (typeof FUND_STEP_ORDER)[number]; label: string; hint: string }[] = [
  { key: 'prepare', label: 'Lock the quest content', hint: 'The content is frozen so it matches what goes on-chain.' },
  { key: 'approve', label: 'Approve the token', hint: 'Lets the escrow contract take the reward from your wallet.' },
  { key: 'create', label: 'Create the quest on-chain', hint: 'Your reward is locked in the escrow contract.' },
  { key: 'confirm', label: 'Verify and publish', hint: 'We check the transaction on-chain and publish the quest.' },
];

function stepState(current: FundStep, index: number, hasError: boolean) {
  if (current === 'done') return 'done';
  const cur = FUND_STEP_ORDER.indexOf(current as (typeof FUND_STEP_ORDER)[number]);
  if (cur === -1) return 'pending';
  if (index < cur) return 'done';
  if (index === cur) return hasError ? 'failed' : 'active';
  return 'pending';
}

const ICON = { done: '✓', active: '…', failed: '!', pending: '○' } as const;

export default function FundQuestPanel({ questId }: { questId: string }) {
  const { isConnected } = useAccount();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const fund = useFundQuest(questId);

  useEffect(() => {
    orpc.quests
      .get({ id: questId })
      .then((q) => setQuest(q as Quest))
      .catch((e) => setLoadErr(errorMessage(e)));
  }, [questId]);

  if (loadErr) return <p className="text-sm" style={{ color: 'var(--danger)' }}>{loadErr}</p>;
  if (!quest) return <div className="muted">Loading…</div>;

  const funded = quest.status !== 'DRAFT' || fund.step === 'done';
  const finalQuest = fund.quest ?? quest;

  if (funded) {
    return (
      <div className="surface space-y-3 p-6">
        <h2 className="font-display text-2xl font-bold">Quest published</h2>
        <p className="muted text-sm">
          {fmtAmount(finalQuest.rewardAmount)} {finalQuest.acceptedTokenSymbol} is locked in escrow.
          Hunters can now see “{finalQuest.title}”.
        </p>
        <Link href={`/quests/${finalQuest.id}`} className="btn btn-primary">View quest</Link>
      </div>
    );
  }

  const frozen = quest.escrowStatus === 'PENDING';

  return (
    <div className="surface space-y-5 p-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Fund “{quest.title}”</h2>
        <p className="muted mt-1 text-sm">
          Reward: <strong>{fmtAmount(quest.rewardAmount)} {quest.acceptedTokenSymbol}</strong> · Deadline: {fmtDate(quest.deadline)}
        </p>
        {!frozen && (
          <p className="muted-2 mt-1 text-xs">
            Once you start funding, the content can’t be edited.{' '}
            <Link href={`/quests/${quest.id}/edit`} className="underline">Edit first</Link>
          </p>
        )}
        {frozen && (
          <p className="muted-2 mt-1 text-xs">
            This draft is locked for funding. To change anything, delete it and create a new one.
          </p>
        )}
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const state = stepState(fund.step, i, !!fund.error);
          return (
            <li key={s.key} className="surface-2 flex items-start gap-3 px-3 py-2 text-sm">
              <span
                className="mt-0.5 w-4 text-center font-bold"
                style={state === 'failed' ? { color: 'var(--danger)' } : undefined}
              >
                {ICON[state]}
              </span>
              <span>
                <span className={state === 'pending' ? 'muted' : 'font-medium'}>{s.label}</span>
                <span className="muted-2 block text-xs">{s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {!isConnected && <p className="muted-2 text-sm">Connect your wallet to continue.</p>}
      {fund.error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{fund.error}</p>}
      {fund.hasSavedTx && !fund.busy && (
        <p className="muted-2 text-xs">
          Your create transaction was already sent. Retrying will only verify and publish it — it won’t charge you again.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={fund.busy || !isConnected} onClick={fund.run}>
          {fund.busy ? 'Working…' : fund.error || fund.hasSavedTx ? 'Retry' : 'Fund quest'}
        </button>
        {fund.hasSavedTx && !fund.busy && fund.error && (
          <button type="button" className="btn" onClick={fund.forgetSavedTx}>
            Discard saved transaction
          </button>
        )}
      </div>
    </div>
  );
}
