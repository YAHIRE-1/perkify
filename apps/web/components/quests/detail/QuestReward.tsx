import type { ReactNode } from 'react';
import { CalendarDays, Wallet } from 'lucide-react';
import { formatReward } from '@/lib/format-reward';

type Props = {
  rewardAmount: string;
  tokenSymbol: string;
  deadline: Date | string;
  children?: ReactNode;
};

export default function QuestReward({ rewardAmount, tokenSymbol, deadline, children }: Props) {
  const reward = formatReward(rewardAmount, 6);
  const date = new Date(deadline);
  const expired = date.getTime() <= Date.now();

  return (
    <section className="surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
          <Wallet aria-hidden className="size-4" /> Quest reward
        </h2>
        <p className="font-display mt-2 flex min-w-0 items-baseline gap-2 text-4xl font-bold text-[var(--accent-text)]">
          <span className="truncate" title={reward.full}>{reward.text}</span>
          <span className="truncate text-lg" title={tokenSymbol}>{tokenSymbol}</span>
        </p>
      </div>

      <div className="flex items-start gap-2.5 border-t border-[var(--border)] pt-4 text-sm">
        <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
        <div>
          <p className="text-[var(--muted)]">{expired ? 'Closed on' : 'Closes on'}</p>
          <time dateTime={date.toISOString()} className="font-medium">
            {date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </time>
          <p className="text-xs text-[var(--muted)]">Your local time</p>
        </div>
      </div>

      {children}
    </section>
  );
}
