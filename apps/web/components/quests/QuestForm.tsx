'use client';
import { useState } from 'react';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import { Button } from '@perkify/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@perkify/ui/components/form';
import { Input } from '@perkify/ui/components/input';
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

const required = <span className="text-destructive">*</span>;

/* -------------------------------------------------------------------------- */
/*  StringListField                                                           */
/*  FormControl le inyecta id / aria-*, así que los reenviamos al Input.      */
/* -------------------------------------------------------------------------- */

interface StringListFieldProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  numbered?: boolean;
}

function StringListField({
  value,
  onChange,
  placeholder,
  numbered = false,
  ...inputProps
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
          {...inputProps}
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

/* -------------------------------------------------------------------------- */
/*  Secciones                                                                 */
/* -------------------------------------------------------------------------- */

function BasicInfoSection() {
  return (
    <>
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title{required}</FormLabel>
            <FormControl>
              <Input
                maxLength={120}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description{required}</FormLabel>
            <FormControl>
              <Textarea
                className="min-h-28"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

interface RewardSectionProps {
  tokens: TokenOption[];
  isLoading: boolean;
  isConnected: boolean;
  tokensError?: string | null;
}

function RewardSection({
  tokens,
  isLoading,
  isConnected,
  tokensError,
}: RewardSectionProps) {
  return (
    <>
      <FormField
        name="tokenId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reward token{required}</FormLabel>
            <FormControl>
              <ReactSelect<TokenOption>
                getOptionLabel={(t) =>
                  t.balance !== null
                    ? `${t.symbol} — balance: ${formatUnits(t.balance, t.decimals)}`
                    : t.symbol
                }
                getOptionValue={(t) => t.id}
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
            </FormControl>
            {tokensError && (
              <p className="text-sm text-destructive">{tokensError}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="rewardAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reward amount{required}</FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  placeholder="25.50"
                  value={field.state.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline{required}</FormLabel>
              <FormControl>
                <Input
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="datetime-local"
                  value={field.state.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function DetailsSection() {
  return (
    <>
      <FormField
        name="milestones"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected milestones{required}</FormLabel>
            <FormControl>
              <StringListField
                numbered
                onChange={field.handleChange}
                placeholder="E.g.: Post on X with the hashtag…"
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category (optional)</FormLabel>
            <FormControl>
              <Input
                maxLength={60}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="criteria"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Acceptance criteria (optional)</FormLabel>
            <FormControl>
              <Textarea
                className="min-h-20"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="validationChecklist"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Validation checklist (optional)</FormLabel>
            <FormControl>
              <StringListField
                onChange={field.handleChange}
                placeholder="Add a point to validate"
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formulario                                                                */
/* -------------------------------------------------------------------------- */

export default function QuestForm() {
  const router = useRouter();
  const createQuest = useCreateQuest();
  const [err, setErr] = useState<string | null>(null);

  const {
    tokens,
    isLoading,
    isConnected,
    error: tokensError,
  } = useAcceptedTokens();

  const goToQuests = () => router.push('/dashboard');

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
    onSubmit: ({ value }) => {
      const result = validate(value);
      if (!result.success) return;

      const d = result.data;
      setErr(null);
      createQuest.mutate(
        {
          ...d,
          category: d.category || null,
          criteria: d.criteria || null,
          deadline: new Date(d.deadline),
        },
        {
          onSuccess: () => {
            goToQuests();
          },
          onError: (e) => {
            setErr(e instanceof Error ? e.message : 'Error saving the quest.');
          },
        }
      );
    },
  });

  const submitting = createQuest.isPending;

  return (
    <Form form={form}>
      <form
        className="surface space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <BasicInfoSection />
        <RewardSection
          isConnected={isConnected}
          isLoading={isLoading}
          tokens={tokens}
          tokensError={tokensError}
        />
        <DetailsSection />

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
          <Button
            disabled={submitting}
            type="submit"
            variant="legacy-primary"
          >
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting ? 'Saving…' : 'Create quest'}
          </Button>
        </div>
      </form>
    </Form>
  );
}