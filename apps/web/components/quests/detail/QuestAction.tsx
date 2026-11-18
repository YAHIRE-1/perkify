import { Translate } from '@/lib/i18n/provider';
import type { QuestDetail } from '@/hooks/participations/use-participation';

export const ROAD_ID = 'quest-road';

type Props = {
  quest: QuestDetail;
};

function getCta(quest: QuestDetail) {
  const p = quest.myParticipation;
  const full = quest.maxParticipants > 0 && quest.taken >= quest.maxParticipants;
  const open = quest.status === 'FUNDED' && new Date(quest.deadline) > new Date();

  if (!p) {
    if (!open) return { label: null, note: 'This quest is not accepting participants.' };
    if (full) return { label: null, note: 'No spots left.' };
    return { label: 'How to join', note: null };
  }

  switch (p.status) {
    case 'JOINED':
      return { label: new Date(p.expiresAt) > new Date() ? 'Submit evidence' : 'View participation', note: null };
    case 'SUBMITTED':
      return { label: 'View review status', note: null };
    case 'REJECTED':
      return { label: 'View feedback', note: null };
    case 'APPROVED':
      return { label: 'Claim reward', note: null };
    default:
      return { label: null, note: null }; // PAID
  }
}

export default function QuestAction({ quest }: Props) {
  // El creador no participa: revisa desde su propio panel
  if (quest.isOwner) return null;

  const { label, note } = getCta(quest);
  if (!label && !note) return null;

  return (
    <div className="space-y-2 border-t border-[var(--border)] pt-4">
      {label && (
        <a href={`#${ROAD_ID}`} className="btn btn-primary w-full">
          <Translate text={label} />
        </a>
      )}
      {note && <p className="muted text-center text-sm"><Translate text={note} /></p>}
    </div>
  );
}
