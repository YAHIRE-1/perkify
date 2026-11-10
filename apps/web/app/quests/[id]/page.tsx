'use client';

import { useParams } from 'next/navigation';
import QuestDetail from '@/components/quests/detail/QuestDetail';

export default function QuestDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <QuestDetail id={params.id} />
    </div>
  );
}