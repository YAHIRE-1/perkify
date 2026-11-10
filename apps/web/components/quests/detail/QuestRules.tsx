type Props = {
  maxParticipants: number;
  submitWindowHours: number;
  reviewWindowHours: number;
  maxAttempts: number;
};

function Rule({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="muted">{label}</span>
      <span className="text-right font-medium">
        {value}
      </span>
    </div>
  );
}

export default function QuestRules({
  maxParticipants,
  submitWindowHours,
  reviewWindowHours,
  maxAttempts,
}: Props) {
  return (
    <section className="surface space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-display font-semibold">
          Participation rules
        </h2>

        <p className="muted text-xs">
          Rules established by the quest creator.
        </p>
      </div>

      <div className="space-y-3">
        <Rule
          label="Max participants"
          value={
            maxParticipants === 0
              ? 'Unlimited'
              : maxParticipants
          }
        />

        <Rule
          label="Submission window"
          value={`${submitWindowHours} hours`}
        />

        <Rule
          label="Review window"
          value={`${reviewWindowHours} hours`}
        />

        <Rule
          label="Maximum attempts"
          value={maxAttempts}
        />
      </div>
    </section>
  );
}