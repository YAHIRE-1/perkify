import type { ReactNode } from 'react';
import { Translate } from '@/lib/i18n/provider';

type Props = {
  description: string;
  deliverables: ReactNode;
  criteria?: string | null;
  validationChecklist?: string[];
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2">
      <h2 className="font-display text-xl font-semibold">
        <Translate text={title} />
      </h2>
      {children}
    </section>
  );
}

export default function QuestDescription({
  description,
  deliverables,
  criteria,
  validationChecklist = [],
}: Props) {
  return (
    <div className="space-y-6">
      <Section title="About this quest">
        <p className="muted whitespace-pre-wrap wrap-break-word leading-relaxed">
          {description}
        </p>
      </Section>

      {deliverables}

      {criteria && (
        <Section title="Acceptance criteria">
          <p className="muted whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
            {criteria}
          </p>
        </Section>
      )}

      {!!validationChecklist.length && (
        <Section title="Review checklist">
          <ul className="space-y-2">
            {validationChecklist.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className="surface-2 flex gap-2 px-3 py-2 text-sm"
              >
                <span
                  aria-hidden className="shrink-0"
                  style={{ color: 'var(--cyan-text)' }}
                >
                  ✓
                </span>

                <span className="min-w-0 wrap-break-word">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}