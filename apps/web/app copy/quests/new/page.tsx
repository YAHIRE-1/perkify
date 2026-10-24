'use client';
import { useRouter } from 'next/navigation';
import type { CreateQuestInput } from '@perkify/db';
import { orpc } from '@/lib/orpc';
import QuestForm from '@/components/quests/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function NewQuestPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return <EmptyState title="Sign in to create a quest" hint="Connect your wallet and sign in first." />;

  const onSubmit = async (data: CreateQuestInput) => {
    const quest = await orpc.quests.create(data);
    router.push(`/quests/${quest.id}/fund`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Create quest</h1>
        <p className="muted mt-1">Save it as a draft first. You’ll fund it in the next step.</p>
      </div>
      <QuestForm submitLabel="Save draft and continue" onSubmit={onSubmit} />
    </div>
  );
}
