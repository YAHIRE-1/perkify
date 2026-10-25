'use client';
import { useState } from 'react';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import type { CreateQuestInput } from '@perkify/db';
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
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import { questFormSchema, EMPTY_QUEST_FORM, type QuestFormValues } from '@/lib/validations/quest';

type TokenOption = ReturnType<typeof useAcceptedTokens>['tokens'][number];

export default function QuestForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (d: CreateQuestInput) => Promise<void>;
}) {
  const [item, setItem] = useState('');
  const [milestone, setMilestone] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { tokens, isLoading, isConnected, error: tokensError } = useAcceptedTokens();

  const validate = (value: QuestFormValues) => {
    const token = tokens.find((t) => t.id === value.tokenId);
    return questFormSchema(token?.decimals ?? 18).safeParse(value);
  };

  const form = useForm({
    defaultValues: EMPTY_QUEST_FORM as QuestFormValues,
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
        await onSubmit({
          ...d,
          category: d.category || null,
          criteria: d.criteria || null,
          deadline: new Date(d.deadline).toISOString(),
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error saving the quest.');
      }
    },
  });

  return (
    <Form form={form}>
      <form
        className="surface space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FormField
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
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
              <FormLabel>Description</FormLabel>
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

        <FormField
          name="tokenId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reward token</FormLabel>
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
                <FormLabel>Reward amount</FormLabel>
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
                <FormLabel>Deadline</FormLabel>
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

        <FormField
          name="milestones"
          render={({ field }) => {
            const list: string[] = field.state.value;
            const add = () => {
              const v = milestone.trim();
              if (!v) return;
              field.handleChange([...list, v]);
              setMilestone('');
            };
            return (
              <FormItem>
                <FormLabel>Expected milestones</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      onChange={(e) => setMilestone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          add();
                        }
                      }}
                      placeholder="E.g.: Post on X with the hashtag…"
                      value={milestone}
                    />
                  </FormControl>
                  <Button type="button" variant="legacy" onClick={add}>Add</Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {list.map((m, i) => (
                    <li
                      key={i}
                      className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span>{i + 1}. {m}</span>
                      <Button
                        type="button"
                        variant="legacy-link"
                        onClick={() => field.handleChange(list.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
                <FormMessage />
              </FormItem>
            );
          }}
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
          render={({ field }) => {
            const list: string[] = field.state.value;
            const add = () => {
              const v = item.trim();
              if (!v) return;
              field.handleChange([...list, v]);
              setItem('');
            };
            return (
              <FormItem>
                <FormLabel>Validation checklist (optional)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      onChange={(e) => setItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          add();
                        }
                      }}
                      placeholder="Add a point to validate"
                      value={item}
                    />
                  </FormControl>
                  <Button type="button" variant="legacy" onClick={add}>Add</Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {list.map((c, i) => (
                    <li
                      key={i}
                      className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      {c}
                      <Button
                        type="button"
                        variant="legacy-link"
                        onClick={() => field.handleChange(list.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {err && <p className="text-sm text-destructive">{err}</p>}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" variant="legacy-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </Form>
  );
}