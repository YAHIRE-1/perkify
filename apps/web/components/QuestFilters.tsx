'use client';
import type { QuestFilters } from '@/api/types';

export const TOKENS = ['ETH', 'USDC', 'USDT', 'PRKY'];

export default function QuestFiltersBar({
  value,
  onChange,
  hideTokenAndBoostFilters = false,
}: {
  value: QuestFilters;
  onChange: (v: QuestFilters) => void;
  hideTokenAndBoostFilters?: boolean;
}) {
  const set = (p: Partial<QuestFilters>) => onChange({ ...value, ...p, page: 1 });
  return (
    <div className={`surface grid gap-3 p-4 sm:grid-cols-[1fr_auto${hideTokenAndBoostFilters ? '' : '_auto_auto'}]`}>
      <input className="input" placeholder="Search quests…" aria-label="Search" value={value.search ?? ''}
        onChange={(e) => set({ search: e.target.value })} />
      <input className="input" placeholder="Category" aria-label="Category" value={value.category ?? ''}
        onChange={(e) => set({ category: e.target.value || undefined })} />
      {!hideTokenAndBoostFilters && (
        <>
          <select className="input" aria-label="Token" value={value.token ?? ''} onChange={(e) => set({ token: e.target.value || undefined })}>
            <option value="">All tokens</option>
            {TOKENS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label className="surface-2 flex cursor-pointer items-center gap-2 px-3 text-sm font-medium">
            <input type="checkbox" checked={!!value.boosted} onChange={(e) => set({ boosted: e.target.checked })} style={{ accentColor: '#7C3AED' }} />
            Boosted only
          </label>
        </>
      )}
    </div>
  );
}