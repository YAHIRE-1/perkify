import type { QuestMilestone } from './quest-detail.types';

type Props = {
  milestones: QuestMilestone[];
};

export default function QuestMilestones({
  milestones,
}: Props) {
  if (!milestones.length) return null;

  const ordered = [...milestones].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display font-semibold">
          Quest milestones
        </h2>

        <p className="muted text-sm">
          Key deliverables required to complete this quest.
        </p>
      </div>

      <ol className="space-y-3">
        {ordered.map((milestone, index) => (
          <li
            key={milestone.id}
            className="surface-2 flex items-start gap-3 p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {index + 1}
            </span>

            <div className="min-w-0 pt-1">
              <p className="break-words text-sm font-medium">
                {milestone.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}