'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CircleHelp,
  PanelLeft,
  PlusCircle,
  Scale,
  ScrollText,
  Store,
  Trophy,
  User,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/provider';

const dismissedInSession = new Set<string>();

export default function FirstRunTour({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const storageKey = `perkify.first-run-tour.v1:${userId}`;
  const steps = [
    {
      title: t("Your navigation menu"),
      description: t("Use the menu button in the top bar to open the sidebar. There you can find the marketplace, reputation rankings, and disputes."),
      icon: PanelLeft,
      items: [
        { label: t("Marketplace"), icon: Store },
        { label: t("Reputation"), icon: Trophy },
        { label: t("Disputes"), icon: Scale },
      ],
    },
    {
      title: t("Manage your quests"),
      description: t("Open My quests to track your activity, or choose Create quest to publish a new one."),
      icon: ScrollText,
      items: [
        { label: t("My quests"), icon: ScrollText },
        { label: t("Create quest"), icon: PlusCircle },
      ],
    },
    {
      title: t("Notifications"),
      description: t("The bell in the top bar opens your notifications. Check it for quest updates, reviews, and rewards."),
      icon: Bell,
      items: [],
    },
    {
      title: t("Profile"),
      description: t("Open your account menu at the bottom of the sidebar to view your profile or sign out."),
      icon: User,
      items: [],
    },
  ];
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const firstStep = stepIndex === 0;
  const lastStep = stepIndex === steps.length - 1;
  const tourLabel = t("Take the tour");

  useEffect(() => {
    if (dismissedInSession.has(storageKey)) return;

    try {
      if (localStorage.getItem(storageKey) === 'seen') return;
    } catch {
      // The tour can still be dismissed for this session.
    }

    dialog.current?.showModal();
  }, [storageKey]);

  const rememberDismissal = () => {
    dismissedInSession.add(storageKey);
    try {
      localStorage.setItem(storageKey, 'seen');
    } catch {
      // Storage may be unavailable.
    }
  };

  const startTour = () => {
    setStepIndex(0);
    dialog.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        aria-label={tourLabel}
        title={tourLabel}
        onClick={startTour}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
      >
        <CircleHelp aria-hidden="true" className="size-5" />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="first-run-tour-title"
        aria-describedby="first-run-tour-description"
        onClose={rememberDismissal}
        className="surface fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-5 text-[var(--fg)] backdrop:bg-black/60 sm:p-6"
      >
        <div aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent-text)]">
              <StepIcon aria-hidden="true" className="size-5" />
            </span>
            <p className="muted text-sm tabular-nums">
              {t("Step {current} of {total}", { current: stepIndex + 1, total: steps.length })}
            </p>
          </div>
          <h2 id="first-run-tour-title" className="mt-4 font-display text-2xl font-semibold">
            {step.title}
          </h2>
          <p id="first-run-tour-description" className="muted mt-2 text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        {step.items.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {step.items.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                <Icon aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
                {label}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn" onClick={() => dialog.current?.close()}>
            {t("Skip tour")}
          </button>
          <div className="flex gap-2">
            {!firstStep && (
              <button type="button" className="btn" onClick={() => setStepIndex(stepIndex - 1)}>
                {t("Back")}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (lastStep) dialog.current?.close();
                else setStepIndex(stepIndex + 1);
              }}
            >
              {lastStep ? t("Done") : t("Next")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
