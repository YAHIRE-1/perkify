import Link from 'next/link';
import type { QuestSummary } from '@/api/types';
import StatusBadge from './StatusBadge';

export default function QuestCard({
  quest: q,
  isOwner = false,
}: {
  quest: QuestSummary;
  isOwner?: boolean;
})  {
  const isDraft = q.status === 'DRAFT';
  const canEdit = isOwner && isDraft;
  const viewHref = canEdit ? `/quests/${q.id}/edit` : `/quests/${q.id}`;

  return (
    <div className="mission-stage">
      <div className={`mission-card ${q.isBoosted ? 'mission-card-boost' : ''}`}>
        <Link href={viewHref} className="mc-clickarea">
          <div className="mc-top">
            {q.category && <span className="mc-tag">{q.category}</span>}
            {q.isBoosted && <span className="mc-tag mc-tag-boost">Boosted · $PRKY</span>}
            <span className="mc-status"><StatusBadge status={q.status} /></span>
          </div>

          <div className="mc-title">{q.title}</div>
          {q.description && <p className="mc-desc line-clamp-2">{q.description}</p>}

          <div className="mc-steps">
            <div className="mc-step">
              <span className="mc-check">✓</span>
              Expires {new Date(q.deadline).toLocaleDateString()}
            </div>
          </div>

          <div className="mc-reward-label">REWARD</div>
          <div className="mc-reward">
            {q.rewardAmount} <span className="mc-reward-token">{q.acceptedTokenSymbol}</span>
          </div>
        </Link>

        <div className="mc-actions">
          {canEdit && (
            <Link href={`/quests/${q.id}/edit`} className="mc-btn mc-btn-ghost">
              EDIT
            </Link>
          )}
          <Link href={`/quests/${q.id}`} className="mc-btn">
            {isOwner ? 'VIEW QUEST' : 'ACCEPT QUEST'}
          </Link>
        </div>
      </div>
    </div>
  );
}