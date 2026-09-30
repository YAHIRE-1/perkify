import Link from 'next/link';
import type { Quest } from '@/collections/schemas/Quest';
import StatusBadge from './StatusBadge';

export default function QuestCard({
  quest: q,
  isOwner = false,
}: {
  quest: Quest;
  isOwner?: boolean;
}) {

  const viewHref = isOwner && q.status === 'DRAFT' ? `/quests/${q.id}/edit` : `/quests/${q.id}`;

  return (
    <div className="mission-stage">
      <div className={`mission-card ${q.boosted ? 'mission-card-boost' : ''}`}>
        <Link href={viewHref} className="mc-clickarea">
          <div className="mc-top">
            {q.category && <span className="mc-tag">{q.category}</span>}
            {q.boosted && <span className="mc-tag mc-tag-boost">Boosted · $PRKY</span>}
            <span className="mc-status"><StatusBadge status={q.status} /></span>
          </div>

          <div className="mc-title">{q.title}</div>
          {q.description && <p className="mc-desc line-clamp-2">{q.description}</p>}

          {q.deadline && (
            <div className="mc-steps">
              <div className="mc-step">
                <span className="mc-check">✓</span>
                Expires {new Date(q.deadline).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="mc-reward-label">REWARD</div>
          <div className="mc-reward">
            {q.reward} <span className="mc-reward-token">{q.token}</span>
          </div>
        </Link>

        <div className="mc-actions">
          {isOwner && (
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