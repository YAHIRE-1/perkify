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
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {isBoosted && (
          <span className="chip chip-boost whitespace-nowrap">
            Boosted · $PRKY
          </span>
        )}

        {category && (
          <span className="chip max-w-[12rem] truncate">
            {category}
          </span>
        )}

        <span className="ml-auto shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>

      <h1 className="font-display break-words text-2xl font-bold sm:text-3xl">
        {title}
      </h1>
    </header>
  );
}
