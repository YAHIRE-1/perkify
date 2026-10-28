'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import EscrowPanel from '@/components/EscrowPanel';
import QuestForm from '@/components/quests/QuestForm';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';
import { useArchiveQuest, useGetQuest } from '@/hooks/quest/use-quest';

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: q, isLoading, error } = useGetQuest(id);
  const archive = useArchiveQuest();

  if (isLoading) return <div className="muted">Cargando…</div>;
  if (error || !q) {
    return <EmptyState title="Quest no encontrada" hint={error?.message} />;
  }

  const isDraft = q.status === 'DRAFT';
  const isOwner = user?.id === q.creatorId;
  const canDeposit = isOwner && isDraft && q.escrowStatus === 'NONE';
  const busy = archive.isPending;

  const cancel = () => {
    if (busy || !window.confirm('¿Cancelar esta quest?')) return;
    archive.mutate(
      { id: q.id, title: q.title, archived: q.archived },
      { onSuccess: () => router.push('/') },
    );
  };

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-3xl font-bold">Editar quest</h1>
        <QuestForm />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <article className="surface space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {q.isBoosted && <span className="chip chip-boost">Boosted · $PRKY</span>}
          {q.category && <span className="chip">{q.category}</span>}
          <StatusBadge status={q.status} />
        </div>

        <h1 className="font-display text-3xl font-bold">{q.title}</h1>
        <p className="muted whitespace-pre-wrap leading-relaxed">{q.description}</p>

        {q.criteria && (
          <section>
            <h2 className="font-display mb-2 font-semibold">Criterios de aceptación</h2>
            <p className="muted whitespace-pre-wrap text-sm leading-relaxed">{q.criteria}</p>
          </section>
        )}

        {!!q.validationChecklist.length && (
          <section>
            <h2 className="font-display mb-2 font-semibold">Checklist de validación</h2>
            <ul className="space-y-2">
              {q.validationChecklist.map((c, i) => (
                <li key={i} className="surface-2 flex gap-2 px-3 py-2 text-sm">
                  <span style={{ color: 'var(--cyan-text)' }}>✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

      </article>

      <aside className="space-y-4">
        <div className="surface p-5">
          <div className="muted-2 text-xs">Recompensa</div>
          <div className="font-display text-4xl font-bold" style={{ color: 'var(--accent-text)' }}>
            {q.rewardAmount}
          </div>
          <div className="muted mt-2 text-sm">
            Fecha límite: {new Date(q.deadline).toLocaleDateString()}
          </div>
          {isOwner && isDraft && (
            <div className="mt-4 flex gap-2">
              <button className="btn flex-1" onClick={() => setEditing(true)} disabled={busy}>
                Editar
              </button>
              <button className="btn flex-1" onClick={cancel} disabled={busy}>
                Cancelar
              </button>
            </div>
          )}
        </div>

        {user && <EscrowPanel quest={q} token={q.token} canDeposit={canDeposit} />}
      </aside>
    </div>
  );
}