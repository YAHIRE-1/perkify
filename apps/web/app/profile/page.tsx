'use client';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import Field from '@/components/Field';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/components/Providers';

export default function Profile() {
  const { user, loading, login, refresh } = useAuth();
  
  // Usamos avatarUrl para que coincida exactamente con la entidad del backend
  const [f, setF] = useState({ name: '', avatarUrl: '', bio: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { 
    if (user) {
      setF({ 
        name: user.name ?? '', 
        avatarUrl: user.avatarUrl ?? '', 
        bio: user.bio ?? '' 
      }); 
    }
  }, [user]);

  if (loading) return null;
  if (!user) {
    return (
      <EmptyState 
        title="Connect your wallet to view your profile" 
        action={<button className="btn btn-primary" onClick={login}>Connect wallet</button>} 
      />
    );
  }

  const save = async () => {
    try { 
      // Enviamos el objeto con la clave avatarUrl esperada por la API
      await api.updateMe(f); 
      await refresh(); 
      setMsg('Profile saved'); 
    } catch (e: any) { 
      setMsg(e.message); 
    }
  };

  const wallet = user.walletAddress;
  const initials = (f.name || wallet || '??').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Your Profile</h1>
      <div className="surface space-y-4 p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full text-xl font-bold" style={{ background: 'var(--lime)', color: 'var(--on-lime)' }}>
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
          <button className="btn btn-primary" onClick={save}>Save changes</button>
          {msg && <span className="muted text-sm">{msg}</span>}
        </div>
      </div>
    </div>
  );
}