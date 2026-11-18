'use client';
import QuestWizard from '@/components/quests/form/quest-wizard';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function NewQuest() {
  const { user, loading, login } = useAuth();

  if (loading) return null;
  if (!user) {
    return (
      <EmptyState
        title="Conecta tu wallet para crear una quest"
        action={<button className="btn btn-primary" onClick={login}>Conectar wallet</button>}
      />
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <QuestWizard />
    </div>
  );
}