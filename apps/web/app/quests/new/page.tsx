'use client';
import { Translate } from '@/lib/i18n/provider';

import QuestWizard from '@/components/quests/form/quest-wizard';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function NewQuest() {
  const { user, loading, login } = useAuth();

  if (loading) return null;
  if (!user) {
    return (
      <EmptyState
        title="Connect your wallet to create a quest"
        action={<button className="btn btn-primary" onClick={login}><Translate text={"Connect wallet"} /></button>}
      />
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <QuestWizard />
    </div>
  );
}