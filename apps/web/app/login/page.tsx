'use client';
import { Translate } from '@/lib/i18n/provider';

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
    try {
      if (await login()) router.push('/dashboard');
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Could not connect your wallet.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="surface mx-auto mt-10 max-w-md space-y-4 p-8 text-center">
      <h1 className="font-display text-3xl font-bold"><Translate text={"Sign in with your wallet"} /></h1>
      <p className="muted text-sm"><Translate text={"Sign a message to log in. Signing costs no gas."} /></p>
      <button className="btn btn-primary w-full" disabled={busy} onClick={go}>
        {busy ? <Translate text={"Waiting for your wallet…"} /> : <Translate text={"Connect wallet"} />}
      </button>
      {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
    </div>
  );
}
