import Link from 'next/link';
import type { QuestSummary } from '@perkify/db/schema/quests';
import { fmtAmount, fmtDate } from '@/lib/format';
import StatusBadge from './StatusBadge';

export default function QuestCard({ quest, actions }: { quest: QuestSummary; actions?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/quests/${quest.id}`} className="font-display text-lg font-bold hover:underline">
          {quest.title}
        </Link>
        <StatusBadge status={quest.status} />
      </div>
      <p className="muted line-clamp-2 text-sm">{quest.description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {fmtAmount(quest.rewardAmount)} {quest.acceptedTokenSymbol}
        </span>
        <span className="muted-2 text-xs">
          {quest.category ? `${quest.category} · ` : ''}Due {fmtDate(quest.deadline)}
        </span>
      </div>
      {actions}
    </div>
  );
}
