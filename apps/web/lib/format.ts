/** "25.500000000000000000" → "25.5" */
export function fmtAmount(v: string): string {
  return v.includes('.') ? v.replace(/\.?0+$/, '') : v;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
