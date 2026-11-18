'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useState } from 'react';
import { Copy, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@perkify/ui/components/avatar';
import { Input } from '@perkify/ui/components/input';
import { Textarea } from '@perkify/ui/components/textarea';
import EmptyState from '@/components/EmptyState';
import EmailPreferences from '@/components/notifications/EmailPreferences';
import { useAuth } from '@/components/Providers';
import { useMe, useUpdateMe } from '@/hooks/useAuth';
import type { SessionUser } from '@/lib/auth-client';

type ProfileFields = { name: string; avatarUrl: string; bio: string };

function ProfileEditor({ user, refetch }: { user: SessionUser; refetch: ReturnType<typeof useMe>['refetch'] }) {
  const { t } = useLanguage();
  const saved = { name: user.name ?? '', avatarUrl: user.avatarUrl ?? '', bio: user.bio ?? '' };
  const [draft, setDraft] = useState<ProfileFields | null>(null);
  const fields = draft ?? saved;
  const update = useUpdateMe();
  const wallet = user.walletAddress;
  const name = fields.name.trim();
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : wallet?.slice(2, 4).toUpperCase() || '?';
  const changed = fields.name !== saved.name || fields.avatarUrl !== saved.avatarUrl || fields.bio !== saved.bio;

  const change = (field: keyof ProfileFields, value: string) => {
    setDraft((current) => ({ ...(current ?? saved), [field]: value }));
    update.reset();
  };

  const copyWallet = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      toast.success(t("Wallet address copied"));
    } catch {
      toast.error(t("Could not copy the wallet address"));
    }
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <aside aria-label="Profile preview" className="surface space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar className="size-16">
            <AvatarImage src={fields.avatarUrl.trim() || undefined} alt="" referrerPolicy="no-referrer" />
            <AvatarFallback className="bg-[var(--lime)] text-lg font-semibold text-[var(--on-lime)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="font-display wrap-anywhere text-xl font-semibold">{name || 'Your profile'}</p>
          </div>
        </div>

        {fields.bio.trim() && (
          <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-[var(--muted)]">
            {fields.bio.trim()}
          </p>
        )}

        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <Wallet aria-hidden className="size-4" />{' '}<Translate text={"Wallet address"} /></p>
          {wallet ? (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 wrap-anywhere text-xs">{wallet}</code>
              <button aria-label={t("Copy wallet address")} className="btn shrink-0" onClick={copyWallet} type="button">
                <Copy aria-hidden className="size-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]"><Translate text={"No wallet linked"} /></p>
          )}
        </div>
      </aside>

      <form
        className="surface space-y-5 p-5 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          if (!changed || update.isPending) return;
          update.mutate(fields, {
            onSuccess: async () => {
              await refetch();
              setDraft(null);
            },
          });
        }}
      >
        <h2 className="font-display text-xl font-semibold"><Translate text={"Edit profile"} /></h2>
        <fieldset className="space-y-4" disabled={update.isPending}>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[var(--accent-text)]" htmlFor="profile-name"><Translate text={"Display name"} /></label>
            <Input id="profile-name" autoComplete="nickname" value={fields.name} onChange={(event) => change('name', event.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[var(--accent-text)]" htmlFor="profile-avatar"><Translate text={"Avatar URL"} /></label>
            <Input id="profile-avatar" type="url" placeholder="https://…" value={fields.avatarUrl} onChange={(event) => change('avatarUrl', event.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[var(--accent-text)]" htmlFor="profile-bio"><Translate text={"Bio"} /></label>
            <Textarea id="profile-bio" className="min-h-28" value={fields.bio} onChange={(event) => change('bio', event.target.value)} />
          </div>
        </fieldset>

        {update.isError && <p role="alert" className="text-sm text-destructive">{t(update.error.message)}</p>}
        {update.isSuccess && <p role="status" className="text-sm text-[var(--accent-text)]"><Translate text={"Profile saved"} /></p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <button type="button" className="btn" disabled={!changed || update.isPending} onClick={() => {
            setDraft(null);
            update.reset();
          }}><Translate text={"Discard changes"} /></button>
          <button type="submit" className="btn btn-primary" disabled={!changed || update.isPending}>
            {update.isPending ? t("Saving…") : t("Save changes")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Profile() {
  const { login, loading } = useAuth();
  const { data: user, isLoading, error, refetch } = useMe();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl"><Translate text={"Your profile"} /></h1>
      {loading || isLoading ? (
        <div role="status" className="surface h-36 motion-safe:animate-pulse">
          <span className="sr-only"><Translate text={"Loading profile"} /></span>
        </div>
      ) : error ? (
        <EmptyState title="Could not load your profile" action={
          <button className="btn" onClick={() => void refetch()} type="button"><Translate text={"Try again"} /></button>
        } />
      ) : user ? (
        <div key={user.id} className="space-y-5">
          <ProfileEditor user={user} refetch={refetch} />
          <EmailPreferences userId={user.id} />
        </div>
      ) : (
        <EmptyState title="Connect your wallet to view your profile" action={
          <button
            className="btn btn-primary"
            onClick={() => login().catch((reason: unknown) => toast.error(
              reason instanceof Error ? reason.message : 'Could not connect your wallet.',
            ))}
            type="button"
          ><Translate text={"Connect wallet"} /></button>
        } />
      )}
    </div>
  );
}
