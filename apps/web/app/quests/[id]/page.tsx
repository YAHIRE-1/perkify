'use client';

import { useParams } from 'next/navigation';
import QuestDetail from '@/components/quests/detail/QuestDetail';

export default function QuestDetailPage() {
  const params = useParams<{ id: string }>();

  return <QuestDetail id={params.id} />;
}