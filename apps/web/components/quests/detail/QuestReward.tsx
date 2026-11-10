import { formatReward } from '@/lib/format-reward';
import type { QuestDetailData } from './quest-detail.types';

type Props = {
  rewardAmount: string;
  tokenSymbol: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DateRow({
  label,
  date,
}: {
  label: string;
  date: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="muted shrink-0">{label}</span>
      <span className="min-w-0 text-right">
        {formatDate(date)}
      </span>
    </div>
  );
}

export default function QuestReward({
  rewardAmount,
  tokenSymbol,
  deadline,
  createdAt,
  updatedAt,
}: Props) {
  const reward = formatReward(rewardAmount, 6);
  const expired = new Date(deadline).getTime() <= Date.now();

  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div>
        <div className="muted-2 text-xs tracking-wider">
          TOTAL REWARD
        </div>

        <div
          className="font-display flex min-w-0 items-baseline gap-2 text-3xl font-bold sm:text-4xl"
          style={{ color: 'var(--accent-text)' }}
          title={`${reward.full} ${tokenSymbol}`}
        >
          <span className="truncate">{reward.text}</span>

          <span className="max-w-[8rem] shrink-0 truncate text-lg">
            {tokenSymbol}
          </span>
        </div>
      </div>

      <div className="space-y-3 border-t pt-3">
        <DateRow label="Created" date={createdAt} />

        <DateRow label="Last updated" date={updatedAt} />

        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="muted shrink-0">Deadline</span>

          <span
            className={`text-right ${
              expired ? 'text-destructive' : ''
            }`}
          >
            {formatDate(deadline)}
            {expired && ' (expired)'}
          </span>
        </div>
      </div>
    </section>
  );
}