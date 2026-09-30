const map: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: '' },
  open: { label: 'Open', cls: 'chip-ok' },
  funded: { label: 'Funded', cls: 'chip-cyan' },
  in_progress: { label: 'In Progress', cls: 'chip-cyan' },
  submitted: { label: 'Submitted', cls: 'chip-cyan' },
  completed: { label: 'Completed', cls: 'chip-ok' },
  disputed: { label: 'Disputed', cls: 'chip-bad' },
  cancelled: { label: 'Canceled', cls: 'chip-bad' },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = map[status?.toLowerCase()] ?? { label: status, cls: '' };
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}