'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/api/client';
import { Quest, QuestStatus } from '@/collections/schemas/Quest';
import StatusBadge from '@/components/StatusBadge';
import EscrowPanel from '@/components/EscrowPanel';
import QuestForm from '@/components/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState<Quest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api.quests.get(id).then(setQ).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <EmptyState title="Quest not found" hint={err} />;
  if (!q) return <div className="muted">Loading…</div>;

  const isDraft = q.status === 'DRAFT';
  const isOwner = user?.id === q.creatorId;

  const cancel = async () => {
    if (!confirm('Cancel this quest?')) return;
    await api.quests.remove(q.id);
    router.push('/');
  };

  if (editing) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Edit quest</h1>
      <QuestForm
        initial={q}
        submitLabel="Save changes"
        onSubmit={async (d) => { setQ(await api.quests.update(q.id, d)); setEditing(false); }}
      />
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <article className="surface space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {q.isBoosted && <span className="chip chip-boost">Boosted · $PRKY</span>}
          {/* category no existe en el backend todavía — ver nota en QuestSchema */}
          <StatusBadge status={q.status} />
        </div>
        <h1 className="font-display text-3xl font-bold">{q.title}</h1>
        <p className="muted whitespace-pre-wrap leading-relaxed">{q.description}</p>
        {/* criteria no existe en el backend todavía — ver nota en QuestSchema */}
        {!!q.validationChecklist?.length && (
          <section>
            <h2 className="font-display mb-2 font-semibold">Validation checklist</h2>
            <ul className="space-y-2">
              {q.validationChecklist.map((c, i) => (
                <li key={i} className="surface-2 flex gap-2 px-3 py-2 text-sm">
                  <span style={{ color: 'var(--cyan-text)' }}>✓</span>{c}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!!q.milestones?.length && (
          <section>
            <h2 className="font-display mb-2 font-semibold">Expected milestones</h2>
            <ul className="space-y-2">
              {q.milestones.map((m) => (
                <li key={m.id} className="surface-2 flex gap-2 px-3 py-2 text-sm">
                  {m.description}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="space-y-4">
        <div className="surface p-5">
          <div className="muted-2 text-xs">Reward</div>
          <div className="font-display text-4xl font-bold" style={{ color: 'var(--accent-text)' }}>
            {q.rewardAmount} {q.acceptedTokenSymbol}
          </div>
          {q.deadline && (
            <div className="muted mt-2 text-sm">
              Deadline: {new Date(q.deadline).toLocaleDateString()}
            </div>
          )}
          {isOwner && isDraft && (
            <div className="mt-4 flex gap-2">
              <button className="btn flex-1" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn flex-1" onClick={cancel}>Cancel</button>
            </div>
          )}
        </div>
        {user && (
          <EscrowPanel
            questId={q.id}
            canDeposit={q.status === 'FUNDED' || isDraft}
          />
        )}
      </aside>
    </div>
  );
}