'use client';
import { useParams } from 'next/navigation';
import FundQuestPanel from '@/components/quests/FundQuestPanel';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function FundQuestPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  if (!user) return <EmptyState title="Sign in to fund your quest" hint="Connect your wallet and sign in first." />;

  return (
    <div className="mx-auto max-w-2xl">
      <FundQuestPanel questId={id} />
    </div>
  );
}
