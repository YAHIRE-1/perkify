export default function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="muted mb-1 block text-sm font-medium">{label}</span>{children}</label>;
}
