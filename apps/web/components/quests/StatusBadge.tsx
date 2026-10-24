const STYLES: Record<string, string> = {
  DRAFT: 'Draft',
  FUNDED: 'Open',
  APPROVED: 'Approved',
  DISPUTED: 'In dispute',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CLAIMED: 'Claimed',
  SUBMITTED: 'Submitted',
  EXPIRED: 'Expired',
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className="surface-2 px-2 py-0.5 text-xs font-medium">{STYLES[status] ?? status}</span>;
}

export const STATUS_LABELS = STYLES;
