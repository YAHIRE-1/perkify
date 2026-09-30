'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/api/client';
import type { Dispute } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

export default function Disputes() {
  const [items, setItems] = useState<Dispute[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.disputes.list().then((p) => setItems(p.items)).catch((e) => setErr(e.message)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Disputas</h1>
      {err ? <EmptyState title="No pudimos cargar tus disputas" hint={err} />
        : !items ? <div className="muted">Cargando…</div>
        : !items.length ? <EmptyState title="No tienes disputas" hint="Si una entrega no cumple los criterios, podrás abrir una desde la quest." />
        : <ul className="space-y-3">{items.map((d) => (
            <li key={d.id} className="surface flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="font-medium">{d.reason ?? `Disputa ${d.id.slice(0, 8)}`}</div>
                {d.questId && <Link href={`/quests/${d.questId}`} className="text-sm" style={{ color: 'var(--cyan-text)' }}>Ver quest</Link>}
              </div>
              {d.status && <StatusBadge status={d.status} />}
            </li>))}</ul>}
    </div>
  );
}
