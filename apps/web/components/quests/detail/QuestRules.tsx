import { Translate } from '@/lib/i18n/provider';
import { formatHours } from "@perkify/db/validations/quest";

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
    <div className="surface-2 space-y-1 px-3 py-2.5 text-sm">
      <dt className="muted"><Translate text={label} /></dt>
      <dd className="font-medium">
        {typeof value === "string" ? <Translate text={value} /> : value}
      </dd>
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
      <h2 className="font-display text-xl font-semibold"><Translate text={"Participation rules"} /></h2>

      <dl className="grid grid-cols-2 gap-2">
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
          value={formatHours(submitWindowHours)}
        />

        <Rule
          label="Review window"
          value={formatHours(reviewWindowHours)}
        />

        <Rule
          label="Maximum attempts"
          value={maxAttempts}
        />
      </dl>
    </section>
  );
}