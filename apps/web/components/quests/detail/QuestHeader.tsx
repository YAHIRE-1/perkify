import { Translate } from '@/lib/i18n/provider';
import StatusBadge from '@/components/StatusBadge';

type Props = {
  title: string;
  category?: string | null;
  status: string;
  isBoosted: boolean;
};

export default function QuestHeader({
  title,
  category,
  status,
  isBoosted,
}: Props) {
  return (
    <header className="surface space-y-3 p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        {isBoosted && (
          <span className="chip chip-boost whitespace-nowrap"><Translate text={"Boosted · $PRKY"} /></span>
        )}

        {category && (
          <span className="chip max-w-[12rem] truncate">
            {category}
          </span>
        )}

        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>

      <h1 className="font-display wrap-anywhere text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
    </header>
  );
}
