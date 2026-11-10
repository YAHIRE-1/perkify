'use client';

import type { QuestDetail } from '@/hooks/participations/use-participation';

export const ROAD_ID = 'quest-road';

type Props = {
  quest: QuestDetail;
  signedIn: boolean;
};

function getCta(quest: QuestDetail) {
  const p = quest.myParticipation;
  const full = quest.maxParticipants > 0 && quest.taken >= quest.maxParticipants;
  const open = quest.status === 'FUNDED' && new Date(quest.deadline) > new Date();

  if (!p) {
    if (!open) return { label: null, note: 'This quest is not accepting participants.' };
    if (full) return { label: null, note: 'No spots left.' };
    return { label: 'Join quest', note: null };
  }

  switch (p.status) {
    case 'JOINED':
      return { label: 'Submit evidence', note: null };
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

export default function QuestAction({ quest, signedIn }: Props) {
  // El creador no participa: revisa desde su propio panel
  if (quest.isOwner) return null;

  const { label, note } = getCta(quest);
  if (!label && !note) return null;

  const goToRoad = () =>
    document.getElementById(ROAD_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="surface space-y-2 p-4 sm:p-5">
      {label && (
        <button type="button" className="btn btn-primary w-full" onClick={goToRoad}>
          {label}
        </button>
      )}
      {!signedIn && label && (
        <p className="muted text-center text-xs">Sign in to join this quest.</p>
      )}
      {note && <p className="muted text-center text-sm">{note}</p>}
    </div>
  );
}