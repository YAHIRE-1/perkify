import type { ReactNode } from "react";
import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  sections: readonly { title: string; text: string }[];
  children: ReactNode;
};

export default function LegalDocument({ title, sections, children }: LegalDocumentProps) {
  return (
    <article lang="en" className="mx-auto max-w-3xl px-1 py-8 sm:py-14">
      <Link href="/" className="text-sm text-[var(--accent-text)] underline underline-offset-4">
        Back to Perkify
      </Link>
      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <div className="mt-8 space-y-7">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 leading-relaxed text-[var(--muted)]">{section.text}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 space-y-3 border-t border-[var(--border)] pt-5 text-sm [&_a]:text-[var(--accent-text)] [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </article>
  );
}
