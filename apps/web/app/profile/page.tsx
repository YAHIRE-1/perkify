'use client';
import { useEffect, useState } from 'react';
import Field from '@/components/Field';
import EmptyState from '@/components/EmptyState';
import { useMe, useUpdateMe } from '@/hooks/useAuth'; // ajusta la ruta a donde viva tu hook

export default function Profile() {
  const { data: user, isLoading, refetch } = useMe();
  const updateMe = useUpdateMe();

  const [f, setF] = useState({ name: '', avatarUrl: '', bio: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setF({
        name: user.name ?? '',
        avatarUrl: user.avatarUrl ?? '',
        bio: user.bio ?? '',
      });
    }
  }, [user]);

  if (isLoading) return null;

  if (!user) {
    return (
      <EmptyState
        title="Connect your wallet to view your profile"
        action={
          // TODO: conectar con tu flujo de login (authClient.signIn..., etc.)
          <button className="btn btn-primary" onClick={() => {}}>
            Connect wallet
          </button>
        }
      />
    );
  }

  const save = () => {
    setMsg(null);
    updateMe.mutate(f, {
      onSuccess: async () => {
        await refetch();
        setMsg('Profile saved');
      },
      onError: (e) => setMsg(e.message),
    });
  };

  const wallet = user.walletAddress;
  const initials = (f.name || wallet || '??').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Your Profile</h1>
      <div className="surface space-y-4 p-6">
        <div className="flex items-center gap-4">
          <div
            className="grid h-16 w-16 place-items-center overflow-hidden rounded-full text-xl font-bold"
            style={{ background: 'var(--lime)', color: 'var(--on-lime)' }}
          >
            {f.avatarUrl ? (
              <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="muted-2 text-xs">Wallet</div>
            <div className="truncate text-sm">{wallet ?? 'No address'}</div>
            {user.role && <span className="chip chip-cyan mt-1">{user.role}</span>}
          </div>
        </div>
        <Field label="Name">
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Avatar URL">
          <input
            className="input"
            value={f.avatarUrl}
            onChange={(e) => setF({ ...f, avatarUrl: e.target.value })}
          />
        </Field>
        <Field label="Bio">
          <textarea
            className="input min-h-24"
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={updateMe.isPending}
          >
            {updateMe.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {msg && <span className="muted text-sm">{msg}</span>}
        </div>
      </div>
    </div>
  );
}