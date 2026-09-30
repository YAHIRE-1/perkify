'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/Providers';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await login(); router.push('/'); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="surface mx-auto mt-10 max-w-md space-y-4 p-8 text-center">
      <h1 className="font-display text-3xl font-bold">Entra con tu wallet</h1>
      <p className="muted text-sm">Firma un mensaje para iniciar sesión. No hay contraseñas y la firma no cuesta gas.</p>
      <button className="btn btn-primary w-full" disabled={busy} onClick={go}>{busy ? 'Esperando firma…' : 'Conectar y firmar'}</button>
      {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
    </div>
  );
}
