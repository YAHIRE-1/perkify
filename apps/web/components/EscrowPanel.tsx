'use client';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import StatusBadge from './StatusBadge';

export default function EscrowPanel({ questId, canDeposit }: { questId: string; canDeposit: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.escrow.status(questId).then((s) => setStatus(s.status)).catch(() => setStatus(null));
  useEffect(() => { load(); }, [questId]);

  const deposit = async () => {
    setBusy(true); setMsg(null);
    try {
      const tx = await api.escrow.prepareDeposit(questId);
      const [from] = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      const hash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: tx.to, data: tx.data, value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : undefined }],
      });
      setMsg(`Deposit sent (${String(hash).slice(0, 10)}…). Status will update once confirmed on-chain.`);
      setTimeout(load, 4000);
    } catch (e: any) { setMsg(e.message ?? 'Failed to send deposit.'); }
    setBusy(false);
  };

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold">Escrow (Kleros)</h3>
        {status && <StatusBadge status={status} />}
      </div>
      <p className="muted mb-4 text-sm">Funds are held in the smart contract until the quest is completed or a dispute is resolved.</p>
      {canDeposit && <button className="btn btn-primary w-full" disabled={busy} onClick={deposit}>{busy ? 'Awaiting wallet…' : 'Deposit funds'}</button>}
      {msg && <p className="muted mt-3 text-sm">{msg}</p>}
    </div>
  );
}