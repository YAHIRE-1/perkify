'use client';
import QuestForm from '@/components/quests/QuestForm';
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
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Crear quest</h1>
       <QuestForm />
    </div>
  );
}