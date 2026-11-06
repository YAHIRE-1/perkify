import Link from 'next/link';
import StatusBadge from './StatusBadge';

// rewardAmount comes from numeric(36,18) → string like "0050.500000000000000000"
function formatReward(value, maxDecimals = 4) {
  const raw = String(value ?? '').trim();
  if (!/^\d*\.?\d*$/.test(raw) || raw === '' || raw === '.') {
    return { text: '0', full: '0' };
  }

  let [int = '', dec = ''] = raw.split('.');
  int = int.replace(/^0+(?=\d)/, '') || '0'; // leading zeros
  dec = dec.replace(/0+$/, '');              // trailing zeros

  const full = dec ? `${int}.${dec}` : int;
  const shownDec = dec.slice(0, maxDecimals).replace(/0+$/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // > 0 but too small to display
  if (int === '0' && dec && !shownDec) {
    return { text: `<0.${'0'.repeat(maxDecimals - 1)}1`, full };
  }

  return { text: shownDec ? `${grouped}.${shownDec}` : grouped, full };
}

export default function QuestCard({ quest: q }) {
  const canEdit = q.isOwner && q.status === 'DRAFT';
  const reward = formatReward(q.rewardAmount);
  const symbol = q.token?.symbol ?? '???';

  const deadlineDate = new Date(q.deadline);
  const isExpired = deadlineDate.getTime() < Date.now();
  const deadline = deadlineDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC', // avoids server/client hydration mismatch
  });

  return (
    <div className="mission-stage w-full min-w-0">
      <div
        className={`mission-card flex h-full min-w-0 flex-col ${
          q.isBoosted ? 'mission-card-boost' : ''
        }`}
      >
        <Link
          href={`/quests/${q.id}`}
          className="mc-clickarea flex min-w-0 flex-1 flex-col gap-2 sm:gap-3"
        >
          <div className="mc-top flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {q.category && (
              <span className="mc-tag max-w-[9rem] truncate sm:max-w-[12rem]">
                {q.category}
              </span>
            )}
            {q.isBoosted && (
              <span className="mc-tag mc-tag-boost whitespace-nowrap">
                Boosted · $PRKY
              </span>
            )}
            <span className="mc-status ml-auto shrink-0">
              <StatusBadge status={q.status} />
            </span>
          </div>

          <div className="mc-title line-clamp-2 break-words text-base sm:text-lg">
            {q.title}
          </div>
          {q.description && (
            <p className="mc-desc line-clamp-2 break-words text-sm">
              {q.description}
            </p>
          )}

          <div className="mc-steps">
            <div
              className={`mc-step min-w-0 ${isExpired ? 'opacity-60' : ''}`}
              suppressHydrationWarning
            >
              <span className="mc-check shrink-0">{isExpired ? '✕' : '✓'}</span>
              <span className="truncate" suppressHydrationWarning>
                {isExpired ? 'Expired' : 'Expires'} {deadline}
              </span>
            </div>
          </div>

          <div className="mt-auto flex min-w-0 items-end justify-between gap-3 pt-2">
            <div className="min-w-0">
              <div className="mc-reward-label">REWARD</div>
              <div
                className="mc-reward flex min-w-0 items-baseline gap-2"
                title={`${reward.full} ${symbol}`}
              >
                <span className="truncate">{reward.text}</span>
                <span className="mc-reward-token max-w-[6rem] shrink-0 truncate">
                  {symbol}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold tracking-wider opacity-70">
              VIEW DETAILS →
            </span>
          </div>
        </Link>

        {canEdit && (
          <div className="mc-actions mt-3">
            <Link href={`/quests/${q.id}/edit`} className="mc-btn mc-btn-ghost">
              EDIT
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}