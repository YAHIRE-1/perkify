'use client';
import { useState } from 'react';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import { Button } from '@perkify/ui/components/button';
import { Input } from '@perkify/ui/components/input';
import { Label } from '@perkify/ui/components/label';
import { ReactSelect } from '@perkify/ui/components/react-select';
import { Textarea } from '@perkify/ui/components/textarea';
import { useCreateQuest } from '@/hooks/quest/use-quest';
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import {
  questFormSchema,
  EMPTY_QUEST_FORM,
  type QuestFormValues,
} from '@/lib/validations/quest';

type TokenOption = ReturnType<typeof useAcceptedTokens>['tokens'][number];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-destructive text-sm" id={id} role="alert">
      {message}
    </p>
  );
}

// Los errores pueden llegar como string (validador de formulario) o como issue con `message`.
function getErrorMessage(errors: unknown[]): string | undefined {
  const [error] = errors;
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  return (error as { message?: string }).message;
}

interface StringListFieldProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  numbered?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

function StringListField({
  id,
  value,
  onChange,
  placeholder,
  numbered = false,
  invalid,
  describedBy,
}: StringListFieldProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          aria-describedby={describedBy}
          aria-invalid={invalid}
          id={id}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          value={draft}
        />
        <Button type="button" variant="legacy" onClick={add}>
          Add
        </Button>
      </div>
      <ul className="mt-2 space-y-1">
        {value.map((text, i) => (
          <li
            key={`${i}-${text}`}
            className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <span>
              {numbered ? `${i + 1}. ` : ''}
              {text}
            </span>
            <Button
              type="button"
              variant="legacy-link"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function QuestForm() {
  const navigate = useNavigate();
  const createQuest = useCreateQuest();
  const [err, setErr] = useState<string | null>(null);

  const { tokens, isLoading, isConnected, error: tokensError } = useAcceptedTokens();

  const goToQuests = () => navigate({ to: '/quests' });

  // El schema depende de los decimales del token seleccionado.
  const validate = (value: QuestFormValues) => {
    const token = tokens.find((t) => t.id === value.tokenId);
    return questFormSchema(token?.decimals ?? 18).safeParse(value);
  };

  const form = useForm({
    defaultValues: EMPTY_QUEST_FORM as QuestFormValues,
    // Valida al enviar y, después del primer envío, en cada cambio.
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = validate(value);
        if (result.success) return undefined;

        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = String(issue.path[0] ?? '');
          if (key && !fields[key]) fields[key] = issue.message;
        }
        return { fields };
      },
    },
    onSubmit: async ({ value }) => {
      const result = validate(value);
      if (!result.success) return;

      const d = result.data;
      setErr(null);
      try {
        await createQuest.mutateAsync({
          ...d,
          category: d.category || null,
          criteria: d.criteria || null,
          deadline: new Date(d.deadline),
        });
        await goToQuests();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error saving the quest.');
      }
    },
  });

  const submitting = createQuest.isPending;

  return (
    <form
      className="surface space-y-4 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="title">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                Title<span className="text-destructive">*</span>
              </Label>
              <Input
                aria-describedby={error && errorId}
                aria-invalid={Boolean(error)}
                id={field.name}
                maxLength={120}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <form.Field name="description">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                Description<span className="text-destructive">*</span>
              </Label>
              <Textarea
                aria-describedby={error && errorId}
                aria-invalid={Boolean(error)}
                className="min-h-28"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <form.Field name="tokenId">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                Reward token<span className="text-destructive">*</span>
              </Label>
              <ReactSelect<TokenOption>
                aria-describedby={error && errorId}
                aria-invalid={Boolean(error)}
                getOptionLabel={(t) =>
                  t.balance !== null
                    ? `${t.symbol} — balance: ${formatUnits(t.balance, t.decimals)}`
                    : t.symbol
                }
                getOptionValue={(t) => t.id}
                inputId={field.name}
                isDisabled={!isConnected}
                isLoading={isLoading}
                noOptionsMessage={() => 'No accepted tokens'}
                onBlur={field.handleBlur}
                onChange={(option) => field.handleChange(option?.id ?? '')}
                options={tokens}
                placeholder={
                  isConnected
                    ? 'Choose a token'
                    : 'Connect your wallet to see the accepted tokens'
                }
                value={tokens.find((t) => t.id === field.state.value) ?? null}
              />
              {tokensError && (
                <p className="text-sm text-destructive">{tokensError}</p>
              )}
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="rewardAmount">
          {(field) => {
            const error = getErrorMessage(field.state.meta.errors);
            const errorId = `${field.name}-error`;

            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Reward amount<span className="text-destructive">*</span>
                </Label>
                <Input
                  aria-describedby={error && errorId}
                  aria-invalid={Boolean(error)}
                  id={field.name}
                  inputMode="decimal"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  placeholder="25.50"
                  value={field.state.value}
                />
                <FieldError id={errorId} message={error} />
              </div>
            );
          }}
        </form.Field>

        <form.Field name="deadline">
          {(field) => {
            const error = getErrorMessage(field.state.meta.errors);
            const errorId = `${field.name}-error`;

            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Deadline<span className="text-destructive">*</span>
                </Label>
                <Input
                  aria-describedby={error && errorId}
                  aria-invalid={Boolean(error)}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="datetime-local"
                  value={field.state.value}
                />
                <FieldError id={errorId} message={error} />
              </div>
            );
          }}
        </form.Field>
      </div>

      <form.Field name="milestones">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                Expected milestones<span className="text-destructive">*</span>
              </Label>
              <StringListField
                describedBy={error && errorId}
                id={field.name}
                invalid={Boolean(error)}
                numbered
                onChange={field.handleChange}
                placeholder="E.g.: Post on X with the hashtag…"
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <form.Field name="category">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Category (optional)</Label>
              <Input
                aria-describedby={error && errorId}
                aria-invalid={Boolean(error)}
                id={field.name}
                maxLength={60}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <form.Field name="criteria">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Acceptance criteria (optional)</Label>
              <Textarea
                aria-describedby={error && errorId}
                aria-invalid={Boolean(error)}
                className="min-h-20"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      <form.Field name="validationChecklist">
        {(field) => {
          const error = getErrorMessage(field.state.meta.errors);
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Validation checklist (optional)</Label>
              <StringListField
                describedBy={error && errorId}
                id={field.name}
                invalid={Boolean(error)}
                onChange={field.handleChange}
                placeholder="Add a point to validate"
                value={field.state.value}
              />
              <FieldError id={errorId} message={error} />
            </div>
          );
        }}
      </form.Field>

      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}

      <div className="flex justify-end gap-4">
        <Button
          disabled={submitting}
          onClick={goToQuests}
          type="button"
          variant="legacy"
        >
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              disabled={isSubmitting || submitting}
              type="submit"
              variant="legacy-primary"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isSubmitting ? 'Saving…' : 'Create quest'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}