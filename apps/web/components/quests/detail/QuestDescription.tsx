import type { ReactNode } from 'react';

type Props = {
  description: string;
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
      <h2 className="font-display font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function QuestDescription({
  description,
  criteria,
  validationChecklist = [],
}: Props) {
  return (
    <div className="space-y-6">
      <Section title="About this quest">
        <p className="muted whitespace-pre-wrap break-words leading-relaxed">
          {description}
        </p>
      </Section>

      {criteria && (
        <Section title="Acceptance criteria">
          <p className="muted whitespace-pre-wrap break-words text-sm leading-relaxed">
            {criteria}
          </p>
        </Section>
      )}

      {!!validationChecklist.length && (
        <Section title="Validation checklist">
          <ul className="space-y-2">
            {validationChecklist.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className="surface-2 flex gap-2 px-3 py-2 text-sm"
              >
                <span
                  className="shrink-0"
                  style={{ color: 'var(--cyan-text)' }}
                >
                  ✓
                </span>

                <span className="min-w-0 break-words">
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