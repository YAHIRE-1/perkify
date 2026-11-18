'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardPaste, Mail } from 'lucide-react';
import { Input } from '@perkify/ui/components/input';
import { Switch } from '@perkify/ui/components/switch';
import { orpc } from '@/utils/orpc';

export default function EmailPreferences({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [address, setAddress] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(Date.now);
  const queryClient = useQueryClient();
  const options = orpc.notifications.emailSettings.queryOptions();
  const queryKey = [...options.queryKey, userId];
  const settings = useQuery({ ...options, queryKey });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const request = useMutation(orpc.notifications.requestEmailCode.mutationOptions({
    onSuccess: () => {
      setCode('');
      setPasteMessage(null);
      setAddress(null);
    },
    onSettled: () => refresh(),
  }));
  const verify = useMutation(orpc.notifications.verifyEmail.mutationOptions({
    onSuccess: async () => {
      setCode('');
      setAddress(null);
      request.reset();
      await refresh();
    },
  }));
  const preference = useMutation(orpc.notifications.setEmailEnabled.mutationOptions({ onSuccess: refresh }));

  const data = settings.data;
  const busy = request.isPending || verify.isPending || preference.isPending;
  const resendAt = data?.resendAvailableAt?.getTime() ?? 0;
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const pasteCode = (clipboardText: string) => {
    const digits = clipboardText.trim().replace(/[\s-]/g, '');
    if (!/^\d{4}$/.test(digits)) {
      setPasteMessage('Copy the four-digit code from your email and try again.');
    } else {
      setCode(digits);
      setPasteMessage(null);
      verify.reset();
    }
    codeInput.current?.focus();
  };

  useEffect(() => {
    setNow(Date.now());
    if (resendAt <= Date.now()) return;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= resendAt) window.clearInterval(timer);
    }, 250);

    return () => window.clearInterval(timer);
  }, [resendAt]);

  return (
    <section id="email-notifications" className="surface scroll-mt-16 space-y-5 p-5 sm:p-7">
      <div className="space-y-1">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Mail aria-hidden className="size-5 text-[var(--accent-text)]" />{' '}<Translate text={"Email notifications"} /></h2>
        <p className="text-sm text-[var(--muted)]"><Translate text={"Verify an email address to receive quest updates there as well as in Perkify."} /></p>
      </div>

      {settings.isPending && <p role="status" className="text-sm"><Translate text={"Loading email preferences…"} /></p>}
      {settings.isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive"><Translate text={"Could not load email preferences."} /></p>
          <button className="btn" onClick={() => void settings.refetch()} type="button"><Translate text={"Try again"} /></button>
        </div>
      )}

      {data && (
        <>
          {data.address && (
            <div className="surface-2 space-y-4 p-4 sm:p-5">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="text-[var(--muted)]"><Translate text={"Verified address"} /></p>
                <p className="wrap-anywhere font-medium">{data.address}</p>
              </div>
              <label className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                <span id="quest-email-updates-label" className="text-sm font-semibold"><Translate text={"Receive quest updates by email"} /></span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span aria-hidden className={`text-xs font-medium ${data.enabled ? 'text-[var(--accent-text)]' : 'text-[var(--muted)]'}`}>
                    {t(preference.isPending ? "Saving…" : data.enabled ? "On" : "Off")}
                  </span>
                  <Switch
                    aria-labelledby="quest-email-updates-label"
                    checked={data.enabled}
                    className="data-checked:bg-[var(--lime)] data-unchecked:bg-[var(--muted-2)] [&_[data-slot=switch-thumb]]:bg-white"
                    disabled={busy || (!data.available && !data.enabled)}
                    onCheckedChange={(enabled) => preference.mutate({ enabled })}
                  />
                </span>
              </label>
            </div>
          )}
          {preference.isError && <p role="alert" className="text-sm text-destructive">{t(preference.error.message)}</p>}
          {!data.available && (
            <p className="text-sm text-[var(--muted)]"><Translate text={"Email delivery is currently unavailable. Updates still appear in your inbox."} /></p>
          )}
          {data.available && !data.address && (
            <form className="space-y-2" onSubmit={(event) => {
              event.preventDefault();
              if (busy || resendIn > 0) return;
              verify.reset();
              request.mutate({ address: (address ?? data.pendingAddress ?? '').trim() });
            }}>
              <label htmlFor="notification-email" className="text-sm font-semibold text-[var(--accent-text)]"><Translate text={"Email address"} /></label>
              <div className="flex flex-wrap gap-2">
                <Input
                  autoComplete="email"
                  className="min-w-0 flex-1"
                  disabled={busy}
                  id="notification-email"
                  maxLength={254}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                  type="email"
                  value={address ?? data.pendingAddress ?? ''}
                />
                <button className="btn" disabled={busy || resendIn > 0} type="submit">
                  {request.isPending ? t("Sending…") : resendIn > 0 ? t("Resend in {seconds}s", { seconds: resendIn }) : t("Send code")}
                </button>
              </div>
              {request.isError && <p role="alert" className="text-sm text-destructive">{t(request.error.message)}</p>}
            </form>
          )}

          {!data.address && data.pendingAddress && (
            <form className="surface-2 space-y-4 px-3 py-5 text-center sm:p-6" onSubmit={(event) => {
              event.preventDefault();
              if (busy || code.length !== 4) return;
              verify.mutate({ code });
            }}>
              <div className="space-y-1">
                <label htmlFor="notification-code" className="font-display text-lg font-semibold"><Translate text={"Enter your verification code"} /></label>
                <p id="notification-code-hint" className="mx-auto max-w-sm wrap-anywhere text-sm text-[var(--muted)]"><Translate text={"Enter the four digits sent to"} />{' '}<strong className="text-[var(--fg)]">{data.pendingAddress}</strong><Translate text={". The code expires after 10 minutes."} /></p>
              </div>
              <div className="group relative mx-auto w-full max-w-60 rounded-lg focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[var(--accent-text)]">
                <input
                  aria-describedby="notification-code-hint"
                  aria-invalid={verify.isError || undefined}
                  autoComplete="one-time-code"
                  className="absolute inset-0 z-10 size-full cursor-text opacity-0"
                  disabled={busy}
                  id="notification-code"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, ''));
                    setPasteMessage(null);
                    verify.reset();
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    pasteCode(event.clipboardData.getData('text'));
                  }}
                  pattern="[0-9]{4}"
                  ref={codeInput}
                  required
                  value={code}
                />
                <div aria-hidden className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`grid h-13 min-w-0 place-items-center rounded-xl border bg-[var(--surface)] font-mono text-2xl font-semibold tabular-nums ${code[index] ? 'border-[var(--accent-text)] text-[var(--fg)]' : 'border-[var(--border)] text-[var(--muted)]'}`}
                    >
                      {code[index] ?? '·'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn" disabled={busy} type="button" onClick={async () => {
                  try {
                    pasteCode(await navigator.clipboard.readText());
                  } catch {
                    setPasteMessage('Paste directly into the code field if clipboard access is blocked.');
                    codeInput.current?.focus();
                  }
                }}>
                  <ClipboardPaste aria-hidden className="size-4" />{' '}<Translate text={"Paste code"} /></button>
                <button className="btn btn-primary" disabled={busy || code.length !== 4} type="submit">
                  {t(verify.isPending ? "Verifying…" : "Verify email")}
                </button>
              </div>
              {pasteMessage && <p role="status" className="text-sm text-[var(--muted)]">{t(pasteMessage)}</p>}
              {verify.isError && <p role="alert" className="text-sm text-destructive">{t(verify.error.message)}</p>}
            </form>
          )}
        </>
      )}
    </section>
  );
}
