'use client';
import { useParams } from 'next/navigation';
import QuestDetail from '@/components/quests/QuestDetail';

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <QuestDetail id={id} />;
}