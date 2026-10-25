'use client';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { formatUnits } from 'viem';
import type { CreateQuestInput } from '@perkify/db';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@perkify/ui/components/form';
import { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import { questFormSchema, EMPTY_QUEST_FORM, type QuestFormValues } from '@/lib/validations/quest';

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

  // El schema depende de los decimales del token elegido, por eso se arma al validar.
  const validate = (value: QuestFormValues) => {
    const token = tokens.find((t) => t.id === value.tokenId);
    return questFormSchema(token?.decimals ?? 18).safeParse(value);
  };

  const form = useForm({
    defaultValues: EMPTY_QUEST_FORM as QuestFormValues,
    validators: {
      // Mapea los errores de zod a cada campo para que FormMessage los muestre.
      onSubmit: ({ value }) => {
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
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <FormField
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <input
                  className="input"
                  maxLength={120}
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
                <textarea
                  className="input min-h-28"
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
              {!isConnected && (
                <p className="muted-2 text-sm">Connect your wallet to see the accepted tokens.</p>
              )}
              {isConnected && isLoading && <p className="muted-2 text-sm">Loading tokens…</p>}
              {tokensError && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{tokensError}</p>
              )}
              {tokens.length > 0 && (
                <FormControl>
                  <select
                    className="input"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  >
                    <option value="" disabled>Choose a token</option>
                    {tokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.symbol}
                        {t.balance !== null ? ` — balance: ${formatUnits(t.balance, t.decimals)}` : ''}
                      </option>
                    ))}
                  </select>
                </FormControl>
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
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="25.50"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.trim())}
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
                  <input
                    className="input"
                    type="datetime-local"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
            const list = field.state.value as string[];
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
                    <input
                      className="input"
                      value={milestone}
                      placeholder="E.g.: Post on X with the hashtag…"
                      onChange={(e) => setMilestone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          add();
                        }
                      }}
                    />
                  </FormControl>
                  <button type="button" className="btn" onClick={add}>Add</button>
                </div>
                <ul className="mt-2 space-y-1">
                  {list.map((m, i) => (
                    <li
                      key={i}
                      className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span>{i + 1}. {m}</span>
                      <button
                        type="button"
                        className="muted-2 text-xs"
                        onClick={() => field.handleChange(list.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
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
                <input
                  className="input"
                  maxLength={60}
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
                <textarea
                  className="input min-h-20"
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="validationChecklist"
          render={({ field }) => {
            const list = field.state.value as string[];
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
                    <input
                      className="input"
                      value={item}
                      placeholder="Add a point to validate"
                      onChange={(e) => setItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          add();
                        }
                      }}
                    />
                  </FormControl>
                  <button type="button" className="btn" onClick={add}>Add</button>
                </div>
                <ul className="mt-2 space-y-1">
                  {list.map((c, i) => (
                    <li
                      key={i}
                      className="surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      {c}
                      <button
                        type="button"
                        className="muted-2 text-xs"
                        onClick={() => field.handleChange(list.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          )}
        </form.Subscribe>
      </form>
    </Form>
  );
}