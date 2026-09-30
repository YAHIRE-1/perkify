'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/api/client';
import type { Quest } from '@/collections/schemas/Quest';
import QuestForm from '@/components/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function EditQuestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState<Quest | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.quests.get(id).then(setQ).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <EmptyState title="Quest not found" hint={err} />;
  if (!q) return <div className="muted">Loading…</div>;

  if (!user || user.id !== q.createdBy) {
    return <EmptyState title="Not authorized" hint="You can only edit quests you created." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="muted-2 text-sm" onClick={() => router.push(`/quests/${q.id}`)}>
        ← Back to quest
      </button>
      <h1 className="font-display text-3xl font-bold">Edit quest</h1>
      <QuestForm
        initial={q}
        submitLabel="Save changes"
        onSubmit={async (d) => {
          await api.quests.update(q.id, d);
          router.push(`/quests/${q.id}`);
        }}
      />
    </div>
  );
}