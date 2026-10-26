'use client';
import { useParams, useRouter } from 'next/navigation';
import QuestForm from '@/components/quests/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useGetQuest, useUpdateQuest } from '@/hooks/quest/use-quest';

export default function EditQuestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: q, error, isPending } = useGetQuest(id);
  const updateQuest = useUpdateQuest();

  if (error) return <EmptyState title="Quest not found" hint={error.message} />;
  if (isPending) return <div className="muted">Loading…</div>;

  if (!user || user.id !== q.creatorId) {
    return <EmptyState title="Not authorized" hint="You can only edit quests you created." />;
  }

  if (q.status !== 'DRAFT') {
    return (
      <EmptyState
        title="Quest can't be edited"
        hint="Only quests in draft status can be edited."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="muted-2 text-sm" onClick={() => router.push(`/quests/${q.id}`)}>
        ← Back to quest
      </button>
      <h1 className="font-display text-3xl font-bold">Edit quest</h1>
      <QuestForm />
    </div>
  );
}