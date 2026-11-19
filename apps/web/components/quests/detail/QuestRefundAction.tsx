'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { questEscrowAbi } from '@perkify/contracts';
import { useAccount, useConfig } from 'wagmi';
import { switchChain, waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { useLanguage } from '@/lib/i18n/provider';
import { useInvalidateQuestQueries } from '@/hooks/quest/use-quest';
import { client } from '@/utils/orpc';
import { parseWalletError } from '../form/quest-logic';

type RefundResult =
  | { kind: 'cancelled' }
  | { kind: 'submitted'; confirmed: boolean };

export default function QuestRefundAction({ id, emergency, reserved }: {
  id: string;
  emergency: boolean;
  reserved: boolean;
}) {
  const { t } = useLanguage();
  const [confirm, setConfirm] = useState(false);
  const { address, chainId: connectedChainId } = useAccount();
  const config = useConfig();
  const invalidateQuestQueries = useInvalidateQuestQueries();
  const refund = useMutation({
    mutationFn: async (): Promise<RefundResult> => {
      const authorization = emergency
        ? await client.quests.emergencyRefund({ id })
        : await client.quests.cancel({ id });
      if (authorization.kind === 'settled') return { kind: 'submitted', confirmed: authorization.confirmed };
      if (address?.toLowerCase() !== authorization.creator.toLowerCase()) {
        throw new Error(t("Connect the wallet that funded this quest."));
      }
      const { escrowAddress, escrowId, chainId } = authorization;
      const chain = config.chains.find((item) => item.id === chainId);
      if (!chain) throw new Error(t("This wallet network is not supported."));
      try {
        if (connectedChainId !== chain.id) await switchChain(config, { chainId: chain.id });

        const hash = 'sig' in authorization
          ? await writeContract(config, {
              address: escrowAddress,
              abi: questEscrowAbi,
              functionName: 'cancelQuest',
              args: [BigInt(escrowId), BigInt(authorization.expiry), authorization.sig],
              chainId: chain.id,
              account: address,
            })
          : await writeContract(config, {
              address: escrowAddress,
              abi: questEscrowAbi,
              functionName: 'refund',
              args: [BigInt(escrowId)],
              chainId: chain.id,
              account: address,
            });
        const tracked = client.quests.confirmRefund({ id, txHash: hash }).catch(() => null);
        let cancelled = false;
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: chain.id,
          timeout: 30_000,
          onReplaced: ({ reason }) => {
            if (reason === 'cancelled') cancelled = true;
          },
        }).catch(() => null);
        const initial = await tracked;
        if (cancelled) return { kind: 'cancelled' };
        if (!receipt) return { kind: 'submitted', confirmed: initial?.confirmed ?? false };
        if (receipt.status !== 'success') throw new Error(t("The refund transaction failed."));
        const result = await client.quests.confirmRefund({ id, txHash: receipt.transactionHash }).catch(() => initial);
        return { kind: 'submitted', confirmed: result?.confirmed ?? false };
      } catch (error) {
        const parsed = parseWalletError(error);
        if (parsed.isRejection) return { kind: 'cancelled' };
        throw new Error(parsed.message);
      }
    },
    onSettled: invalidateQuestQueries,
  });

  if (refund.data?.kind === 'submitted') {
    return (
      <p role="status" className="text-sm text-[var(--muted)]">
        {refund.data.confirmed ? t("Refund confirmed.") : t("Refund submitted. Waiting for final confirmation.")}
      </p>
    );
  }

  const cancelled = refund.data?.kind === 'cancelled';

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      {reserved && (!confirm || cancelled) && (
        <p className="text-sm text-[var(--muted)]">{t("Joining is paused while the cancellation is pending.")}</p>
      )}
      {cancelled && (
        <p role="status" className="text-sm text-[var(--muted)]">
          {t("You cancelled the request in your wallet. No refund was sent.")}
        </p>
      )}
      {confirm ? (
        <>
          <p className="text-sm text-[var(--muted)]">
            {emergency ? t("The escrow will return the funds to the wallet that funded this quest.")
              : t("Cancelling closes the quest and returns the reward to the wallet that funded it.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={refund.isPending} onClick={() => refund.mutate()}>
              {refund.isPending ? t("Waiting for wallet or network…") : t("Confirm in wallet")}
            </button>
            <button type="button" className="btn" disabled={refund.isPending} onClick={() => {
              setConfirm(false);
              refund.reset();
            }}>{t("Back")}</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn w-full" onClick={() => setConfirm(true)}>
          {emergency ? t("Claim emergency refund") : t("Cancel quest")}
        </button>
      )}
      {refund.isError && <p role="alert" className="text-sm text-destructive">{t(refund.error.message)}</p>}
    </div>
  );
}
