'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/api/client';
import type { CreateQuestInput } from '@/api/types';
import QuestForm from '@/components/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { sendFundingTransaction } from '@/lib/web3-utils';

export default function NewQuest() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  if (loading) return null;
  if (!user) return <EmptyState title="Conecta tu wallet para crear una quest" action={<button className="btn btn-primary" onClick={login}>Conectar wallet</button>} />;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Crear quest</h1>
      <QuestForm
        submitLabel="Crear quest"
        onSubmit={async (d) => {
          const q = await api.quests.create(d as CreateQuestInput);
          const txData = await api.escrow.prepareDeposit(q.id);
          await sendFundingTransaction(txData);
          router.push(`/quests/${q.id}`);
        }}
      />
    </div>
  );
}