'use client';
import { useRef, useState } from 'react';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { erc20Abi, formatUnits } from 'viem';
import { useAccount, useConfig } from 'wagmi';
import {
  readContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import { questEscrowAbi } from '@perkify/contracts';
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
import { authClient } from '@/lib/auth-client';
import { useConfirmQuest, useCreateQuest } from '@/hooks/quest/use-quest';
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
/*  Fondeo on-chain                                                           */
/* -------------------------------------------------------------------------- */

type Step =
  | 'idle'
  | 'creating'
  | 'switching'
  | 'approving'
  | 'depositing'
  | 'confirming';

const STEP_LABEL: Record<Step, string> = {
  idle: 'Create quest',
  creating: 'Creating draft…',
  switching: 'Switching network…',
  approving: 'Approve the token in your wallet…',
  depositing: 'Confirm the deposit in your wallet…',
  confirming: 'Verifying on-chain…',
};

interface EscrowParams {
  chainId: number;
  escrowAddress: `0x${string}`;
  args: {
    token: `0x${string}`;
    reward: string;
    deadline: number;
    refundGrace: number;
    reviewWindow: number;
    uri: string;
  };
}

// Borrador ya creado: permite reintentar sin crear otro.
interface Pending {
  questId: string;
  escrow: EscrowParams;
  txHash?: `0x${string}`;
}

function errorMessage(e: unknown) {
  if (e instanceof Error) {
    return /user rejected|user denied/i.test(e.message)
      ? 'You rejected the request in your wallet.'
      : e.message;
  }
  return 'Error saving the quest.';
}

/* -------------------------------------------------------------------------- */
/*  Formulario                                                                */
/* -------------------------------------------------------------------------- */

export default function QuestForm() {
  const router = useRouter();
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const createQuest = useCreateQuest();
  const confirmQuest = useConfirmQuest();
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const pending = useRef<Pending | null>(null);

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

  // Pasos on-chain + confirmación. Se puede reanudar desde donde falló.
  const fund = async (p: Pending) => {
    if (!address) throw new Error('Connect your wallet first.');
    const { escrow } = p;
    const chainId = escrow.chainId as (typeof config.chains)[number]['id'];
    const amount = BigInt(escrow.args.reward);

    if (!p.txHash) {
      if (walletChainId !== escrow.chainId) {
        setStep('switching');
        await switchChain(config, { chainId });
      }

      const allowance = await readContract(config, {
        address: escrow.args.token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, escrow.escrowAddress],
        chainId,
      });

      if (allowance < amount) {
        setStep('approving');
        const approveHash = await writeContract(config, {
          address: escrow.args.token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [escrow.escrowAddress, amount],
          chainId,
        });
        const approveReceipt = await waitForTransactionReceipt(config, {
          hash: approveHash,
          chainId,
        });
        if (approveReceipt.status !== 'success') {
          throw new Error('Approval failed.');
        }
      }

      setStep('depositing');
      p.txHash = await writeContract(config, {
        address: escrow.escrowAddress,
        abi: questEscrowAbi,
        functionName: 'createQuest',
        args: [
          escrow.args.token,
          amount,
          BigInt(escrow.args.deadline),
          BigInt(escrow.args.refundGrace),
          BigInt(escrow.args.reviewWindow),
          escrow.args.uri,
        ],
        chainId,
      });
    }

    setStep('confirming');
    const receipt = await waitForTransactionReceipt(config, {
      hash: p.txHash,
      chainId,
    });
    if (receipt.status !== 'success') {
      p.txHash = undefined; // la tx revirtió: el reintento vuelve a depositar
      throw new Error('The deposit transaction failed.');
    }

    await confirmQuest.mutateAsync({ id: p.questId, txHash: p.txHash });
    pending.current = null;
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

      setErr(null);

      if (!address) {
        setErr('Connect your wallet first.');
        return;
      }

      try {
        // Solo al empezar de cero: con un borrador pendiente ya se validó.
        if (!pending.current) {
          // Sesión fresca: la cacheada puede no traer walletAddress tras el login.
          // El depósito sale de la wallet conectada, pero confirm exige que
          // el creador on-chain sea la wallet de la sesión.
          const { data: fresh } = await authClient.getSession({
            query: { disableCookieCache: true },
          });
          const sessionWallet = fresh?.user.walletAddress;

          if (!sessionWallet) {
            setErr('Your session has no linked wallet. Sign in again.');
            return;
          }
          if (address.toLowerCase() !== sessionWallet.toLowerCase()) {
            setErr(
              'The connected wallet differs from the one you signed in with. Switch accounts in your wallet.'
            );
            return;
          }

          setStep('creating');
          const d = result.data;
          const created = await createQuest.mutateAsync({
            ...d,
            category: d.category || null,
            criteria: d.criteria || null,
            deadline: new Date(d.deadline).toISOString(),
          });
          pending.current = {
            questId: created.quest.id,
            escrow: created.escrow as EscrowParams,
          };
        }

        await fund(pending.current);
        goToQuests();
      } catch (e) {
        setErr(errorMessage(e));
      } finally {
        setStep('idle');
      }
    },
  });

  const submitting = step !== 'idle';

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
            {pending.current ? ' You can retry: the draft is kept.' : ''}
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
          <Button disabled={submitting} type="submit" variant="legacy-primary">
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {STEP_LABEL[step]}
          </Button>
        </div>
      </form>
    </Form>
  );
}