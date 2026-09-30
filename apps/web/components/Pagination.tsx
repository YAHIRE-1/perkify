export default function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
      <span className="muted text-sm">Página {page} de {pages}</span>
      <button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</button>
    </div>
  );
}
