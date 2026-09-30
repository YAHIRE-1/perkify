export default function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="surface p-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="muted mt-1 text-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
