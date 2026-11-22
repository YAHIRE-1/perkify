'use client';
import { Translate, useLanguage } from '@/lib/i18n/provider';

import ChecklistProofSwitch from './ChecklistProofSettings';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatUnits } from 'viem';
import { Button } from '@perkify/ui/components/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@perkify/ui/components/form';
import { Input } from '@perkify/ui/components/input';
import { ReactSelect } from '@perkify/ui/components/react-select';
import { Textarea } from '@perkify/ui/components/textarea';
import type { useAcceptedTokens } from '@/hooks/useAcceptedTokens';
import {
  formatHours,
  minimumDeadline,
  QUEST_DEFAULTS,
  QUEST_LIMITS as LIMITS,
  type QuestFormValues,
} from '@perkify/db/validations/quest';
import {
  deadlinePresets,
  earliestRecommendedLocal,
  maxAmountString,
  toDatetimeLocal,
  userTimeZoneLabel,
  type QuestIssue,
} from './quest-logic';
import { QuestTimeline } from './quest-timeline';

export type TokenOption = ReturnType<typeof useAcceptedTokens>['tokens'][number];

const required = <span className="text-destructive">*</span>;

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

/** Contador que avisa al llegar al 90 % del límite. */
const Counter = ({ value, max }: { value: string; max: number }) => (
  <span
    className={
      'shrink-0 text-xs tabular-nums ' +
      (value.length >= max * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')
    }
  >
    {value.length}/{max}
  </span>
);

const HintRow = ({ children, counter }: { children?: React.ReactNode; counter?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <div>{children}</div>
    {counter}
  </div>
);

/** Bloque con título y explicación: agrupa campos que el usuario debe pensar juntos. */
function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="surface space-y-5 p-5">
      <legend className="sr-only">{title}</legend>
      <div className="space-y-1" aria-hidden>
        <h3 className="text-base font-semibold"><Translate text={title} /></h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </fieldset>
  );
}

/** Botones de opción (atajos): no son campos, solo rellenan valores. */
function Chip({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        'rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' +
        (active ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground')
      }
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  StringListField                                                           */
/* -------------------------------------------------------------------------- */

interface StringListFieldProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  numbered?: boolean;
  reorderable?: boolean;
  maxItems: number;
  maxLength: number;
  renderItemControl?: (item: string) => React.ReactNode;
}

function StringListField({
  value,
  onChange,
  placeholder,
  numbered = false,
  reorderable = false,
  maxItems,
  maxLength,
  renderItemControl,
  ...inputProps
}: StringListFieldProps) {
  const [draft, setDraft] = useState('');
  const atLimit = value.length >= maxItems;

  // También se llama al salir del input: si el usuario escribió y pulsa
  // "Continue" sin darle a "Add", el texto no se pierde.
  const commit = () => {
    const v = draft.trim();
    if (!v || atLimit) return;
    onChange([...value, v]);
    setDraft('');
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const copy = [...value];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          {...inputProps}
          disabled={atLimit}
          maxLength={maxLength}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // no avanzar de paso ni enviar el form
              commit();
            }
          }}
          placeholder={placeholder}
          value={draft}
        />
        <Button type="button" variant="legacy" disabled={!draft.trim() || atLimit} onClick={commit}><Translate text={"Add"} /></Button>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{draft.trim() ? 'Press Enter or tap Add to save this item.' : ''}</span>
        <span className="tabular-nums">
          {value.length}/{maxItems}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {value.map((text, i) => (
          <li
            key={`${i}-${text}`}
            className="surface-2 space-y-2 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words">
                {numbered ? `${i + 1}. ` : ''}
                {text}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {reorderable && value.length > 1 && (
                  <>
                    <button
                      aria-label={`Move item ${i + 1} up`}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      type="button"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      aria-label={`Move item ${i + 1} down`}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={i === value.length - 1}
                      onClick={() => move(i, 1)}
                      type="button"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </>
                )}
                <Button
                  type="button"
                  variant="legacy-link"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                ><Translate text={"Remove"} /></Button>
              </span>
            </div>
            {renderItemControl?.(text)}
          </li>
        ))}
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Paso 1 · Basics                                                           */
/* -------------------------------------------------------------------------- */

export function BasicsStep() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel><Translate text={"Title"} />{required}</FormLabel>
            <FormControl>
              <Input
                maxLength={LIMITS.title}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("Share our launch on X")}
                value={field.state.value}
              />
            </FormControl>
            <HintRow counter={<Counter max={LIMITS.title} value={field.state.value} />}>
              <Hint><Translate text={"Short and specific. This is what people see in the list."} /></Hint>
            </HintRow>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel><Translate text={"Description"} />{required}</FormLabel>
            <FormControl>
              <Textarea
                className="min-h-40"
                maxLength={LIMITS.description}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <HintRow counter={<Counter max={LIMITS.description} value={field.state.value} />}>
              <Hint><Translate text={"What is this for and why should someone do it? At least 20 characters."} /></Hint>
            </HintRow>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel><Translate text={"Category (optional)"} /></FormLabel>
            <FormControl>
              <Input
                maxLength={LIMITS.category}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("Social, Content, Development…")}
                value={field.state.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Paso 2 · Reward                                                           */
/* -------------------------------------------------------------------------- */

interface RewardStepProps {
  tokens: TokenOption[];
  selectedToken?: TokenOption;
  networkName?: string;
  isLoading: boolean;
  isConnected: boolean;
  tokensError?: string | null;
  /** Tu botón de conexión (p. ej. <ConnectButton />). */
  connectSlot?: React.ReactNode;
  onRetryTokens?: () => void;
}

export function RewardStep({
  tokens,
  selectedToken,
  networkName,
  isLoading,
  isConnected,
  tokensError,
  connectSlot,
  onRetryTokens,
}: RewardStepProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      {!isConnected && (
        <div className="surface-2 flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="font-medium"><Translate text={"Connect your wallet"} /></p>
            <p className="text-muted-foreground"><Translate text={"We need it to show which tokens you can use and how much you have."} /></p>
          </div>
          {connectSlot}
        </div>
      )}

      <div className="surface-2 space-y-4 p-4 sm:p-5">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <FormField
            name="tokenId"
            render={({ field }) => (
              <FormItem>
                <FormLabel><Translate text={"Reward token"} />{required}</FormLabel>
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
                    noOptionsMessage={() => t("No accepted tokens")}
                    onBlur={field.handleBlur}
                    onChange={(option) => field.handleChange(option?.id ?? '')}
                    options={tokens}
                    placeholder={isConnected ? t("Choose a token") : t("Connect your wallet first")}
                    value={tokens.find((t) => t.id === field.state.value) ?? null}
                  />
                </FormControl>
                {tokensError && (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    {tokensError}
                    {onRetryTokens && (
                      <Button type="button" variant="legacy-link" onClick={onRetryTokens}><Translate text={"Try again"} /></Button>
                    )}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="rewardAmount"
            render={({ field }) => {
              const balance = selectedToken?.balance ?? null;
              return (
                <FormItem>
                  <FormLabel><Translate text={"Reward amount"} />{required}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={!selectedToken}
                      inputMode="decimal"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value.trim())}
                      placeholder={selectedToken ? `25.50 ${selectedToken.symbol}` : t("Choose a token first")}
                      value={field.state.value}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {selectedToken && balance !== null
                        ? balance === BigInt(0)
                          ? `You have no ${selectedToken.symbol} in this wallet.`
                          : `Your balance: ${formatUnits(balance, selectedToken.decimals)} ${selectedToken.symbol}`
                        : selectedToken ? 'Wallet balance unavailable.' : ''}
                    </span>
                    {selectedToken && balance !== null && balance > BigInt(0) && (
                      <Button
                        type="button"
                        variant="legacy-link"
                        onClick={() => {
                          field.handleChange(maxAmountString(selectedToken));
                          field.handleBlur();
                        }}
                      ><Translate text={"Use max"} /></Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          {networkName && <p><Translate text={"Deposit network"} />{' '}<strong className="text-foreground">{networkName}</strong></p>}
          <p><Translate text={"Your reward is locked in escrow when you confirm the deposit."} /></p>
        </div>
      </div>

      <FormField
        name="isBoosted"
        render={({ field }) => (
          <FormItem>
            <div className="surface-2 flex items-start gap-3 p-4">
              <FormControl>
                <input
                  checked={field.state.value}
                  className="mt-1 size-4"
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel><Translate text={"Boost this quest"} /></FormLabel>
                <Hint><Translate text={"Give it more visibility in the quest list."} /></Hint>
              </div>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Paso 3 · Tasks                                                            */
/* -------------------------------------------------------------------------- */

export function TasksStep() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <FormField
        name="milestones"
        render={({ field }) => (
          <FormItem>
            <FormLabel><Translate text={"What participants must deliver"} />{required}</FormLabel>
            <Hint><Translate text={"One concrete result per line, in the order they should be done. Start with a verb: “Post on X with the hashtag…”."} /></Hint>
            <FormControl>
              <StringListField
                maxItems={LIMITS.milestoneItems}
                maxLength={LIMITS.milestoneLength}
                numbered
                onChange={field.handleChange}
                placeholder={t("Add a deliverable")}
                reorderable
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
            <FormLabel><Translate text={"Acceptance criteria (optional)"} /></FormLabel>
            <FormControl>
              <Textarea
                className="min-h-24"
                maxLength={LIMITS.criteria}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                value={field.state.value}
              />
            </FormControl>
            <HintRow counter={<Counter max={LIMITS.criteria} value={field.state.value} />}>
              <Hint><Translate text={"Describe what a submission needs to meet for you to approve it."} /></Hint>
            </HintRow>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="validationChecklist"
        render={({ field }) => (
          <FormItem>
            <FormLabel><Translate text={"Review checklist (optional)"} /></FormLabel>
            <p className="text-xs text-muted-foreground">
              <Translate text="Use the checklist to define what you’ll verify. Turn on proof only where you need a link or file." />
            </p>
            <FormField
              name="checklistProofRequired"
              render={({ field: settings }) => (
                <FormControl>
                  <StringListField
                    maxItems={LIMITS.checklistItems}
                    maxLength={LIMITS.checklistLength}
                    onChange={(items) => {
                      field.handleChange(items);
                      const required = settings.state.value.filter((item: string) => items.includes(item));
                      settings.handleChange(required);
                    }}
                    placeholder={t("Add something to check")}
                    reorderable
                    value={field.state.value}
                    renderItemControl={(item) => (
                      <ChecklistProofSwitch
                        item={item}
                        checked={settings.state.value.includes(item)}
                        onChange={(checked) => settings.handleChange(checked
                          ? [...settings.state.value, item]
                          : settings.state.value.filter((entry: string) => entry !== item))}
                      />
                    )}
                  />
                </FormControl>
              )}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Paso 4 · Schedule (ventanas + deadline + intentos + participantes juntos)  */
/* -------------------------------------------------------------------------- */

const PACES = [
  { id: 'quick', label: 'Quick', detail: '1 day to submit, 1 day to review', submit: 24, review: 24 },
  { id: 'standard', label: 'Standard', detail: '3 days to submit, 3 days to review', submit: 72, review: 72 },
  { id: 'relaxed', label: 'Relaxed', detail: '7 days to submit, 3 days to review', submit: 168, review: 72 },
] as const;

type NumberName = 'submitWindowHours' | 'reviewWindowHours' | 'maxAttempts';

function NumberField({
  name,
  label,
  hint,
  min,
  max,
  hours = false,
}: {
  name: NumberName;
  label: string;
  hint: string;
  min: number;
  max: number;
  hours?: boolean;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const n = field.state.value;
        return (
          <FormItem>
            <FormLabel>
              <Translate text={label} />
              {required}
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                max={max}
                min={min}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                type="number"
                value={Number.isNaN(n) ? '' : n}
              />
            </FormControl>
            <Hint>
              <Translate text={hint} />
              {hours && Number.isFinite(n) && n >= 48 ? ` That is ${formatHours(n)}.` : ''}
            </Hint>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

interface TimingStepProps {
  values: QuestFormValues;
  issues: readonly QuestIssue[];
  setValue: <K extends keyof QuestFormValues>(name: K, value: QuestFormValues[K]) => void;
}

export function TimingStep({ values, issues, setValue }: TimingStepProps) {
  const presets = deadlinePresets(values);
  const recommended = earliestRecommendedLocal(values);
  const [showSettings, setShowSettings] = useState(false);
  const hasSettingsError = issues.some(
    (issue) =>
      issue.severity === 'error' &&
      ['maxParticipants', 'maxAttempts', 'submitWindowHours', 'reviewWindowHours'].includes(issue.field),
  );

  useEffect(() => {
    if (hasSettingsError) setShowSettings(true);
  }, [hasSettingsError]);

  return (
    <div className="space-y-6">
      <Group
        description="Choose when the quest stops accepting new hunters and submissions."
        title="When the quest closes"
      >
        <FormField
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel><Translate text={"Deadline"} />{required}</FormLabel>
              <FormControl>
                <Input
                  min={toDatetimeLocal(minimumDeadline(values))}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="datetime-local"
                  value={field.state.value}
                />
              </FormControl>
              <Hint><Translate text={"Your time zone:"} />{' '}{userTimeZoneLabel()}</Hint>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {recommended && (
                  <Chip
                    active={field.state.value === recommended}
                    onClick={() => field.handleChange(recommended)}
                    title="The earliest date that still lets someone who joins now submit and be reviewed."
                  ><Translate text={"Suggested earliest close"} /></Chip>
                )}
                {presets.map((p) => (
                  <Chip
                    key={p.label}
                    active={field.state.value === p.value}
                    disabled={p.disabled}
                    onClick={() => field.handleChange(p.value)}
                    title={p.disabled ? 'Too soon for the time to submit you chose.' : undefined}
                  >
                    {p.label}
                  </Chip>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </Group>

      <QuestTimeline issues={issues} values={values} />

      <details
        className="surface-2 px-4 py-3 sm:px-5"
        open={showSettings}
        onToggle={(event) => setShowSettings(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold"><Translate text={"Participation settings"} /></summary>
        <p className="mt-2 text-sm text-muted-foreground"><Translate text={"Up to"} />{' '}{formatHours(values.submitWindowHours)}{' '}<Translate text={"to submit and"} />{' '}{formatHours(values.reviewWindowHours)}{' '}<Translate text={"to review."} />{' '}{values.maxParticipants === 0 ? 'Unlimited spots' : `${values.maxParticipants} spots`}
          {' · '}{values.maxAttempts} {values.maxAttempts === 1 ? 'attempt' : 'attempts'}{' '}<Translate text={"per hunter."} /></p>
        <div className="mt-4 space-y-4">
          <Group
            description="Once someone joins, the clock starts. These three numbers decide how long it takes from start to payout."
            title="Time for each participant"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium"><Translate text={"Quick setup"} /></p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PACES.map((p) => {
                  const active =
                    values.submitWindowHours === p.submit && values.reviewWindowHours === p.review;
                  return (
                    <button
                      key={p.id}
                      aria-pressed={active}
                      className={
                        'rounded-lg border p-3 text-left text-sm transition-colors ' +
                        (active ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground')
                      }
                      onClick={() => {
                        setValue('submitWindowHours', p.submit);
                        setValue('reviewWindowHours', p.review);
                      }}
                      type="button"
                    >
                      <span className="block font-medium"><Translate text={p.label} /></span>
                      <span className="block text-xs text-muted-foreground"><Translate text={p.detail} /></span>
                    </button>
                  );
                })}
              </div>
              <Hint><Translate text={"Or set your own numbers below."} /></Hint>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <NumberField
                hint="Hours a person has to deliver after joining."
                hours
                label="Time to submit"
                max={LIMITS.submitWindowHours.max}
                min={LIMITS.submitWindowHours.min}
                name="submitWindowHours"
              />
              <NumberField
                hint="Hours you have to approve or reject."
                hours
                label="Time to review"
                max={LIMITS.reviewWindowHours.max}
                min={LIMITS.reviewWindowHours.min}
                name="reviewWindowHours"
              />
              <NumberField
                hint="Tries each person gets."
                label="Attempts"
                max={LIMITS.maxAttempts.max}
                min={LIMITS.maxAttempts.min}
                name="maxAttempts"
              />
            </div>
          </Group>

          <Group description="How many people can take part at the same time." title="Participants">
            <FormField
              name="maxParticipants"
              render={({ field }) => {
                const noLimit = field.state.value === 0;
                return (
                  <FormItem>
                    <FormLabel><Translate text={"Max participants"} />{required}
                    </FormLabel>
                    <div className="flex flex-wrap items-center gap-4">
                      <FormControl>
                        <Input
                          className="w-32"
                          disabled={noLimit}
                          inputMode="numeric"
                          max={LIMITS.maxParticipants}
                          min={1}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                          type="number"
                          value={noLimit || Number.isNaN(field.state.value) ? '' : field.state.value}
                        />
                      </FormControl>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          checked={noLimit}
                          className="size-4"
                          onChange={(e) =>
                            field.handleChange(e.target.checked ? 0 : QUEST_DEFAULTS.maxParticipants)
                          }
                          type="checkbox"
                        /><Translate text={"No limit"} /></label>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </Group>
        </div>
      </details>
    </div>
  );
}