'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { CreateQuestInput, Quest } from '@perkify/db';
import { orpc, errorMessage } from '@/lib/orpc';
import QuestForm from '@/components/quests/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function EditQuestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    orpc.quests
      .get({ id })
      .then((q) => setQuest(q as Quest))
      .catch((e) => setErr(errorMessage(e)));
  }, [id, user]);

  if (!user) return <EmptyState title="Sign in to edit your quest" hint="Connect your wallet and sign in first." />;
  if (err) return <EmptyState title="Could not load the quest" hint={err} />;
  if (!quest) return <div className="muted">Loading…</div>;

  if (quest.status !== 'DRAFT' || quest.escrowStatus !== 'NONE') {
    return (
      <EmptyState
        title="This quest can’t be edited"
        hint="Once funding starts the content is locked. Delete the draft and create a new one to change it."
      />
    );
  }

  const onSubmit = async (data: CreateQuestInput) => {
    await orpc.quests.update({ id, data });
    router.push(`/quests/${id}/fund`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Edit draft</h1>
        <p className="muted mt-1">
          <Link href="/quests/mine" className="underline">Back to my quests</Link>
        </p>
      </div>
      <QuestForm initial={quest} submitLabel="Save changes" onSubmit={onSubmit} />
    </div>
  );
}
