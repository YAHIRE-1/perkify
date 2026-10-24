'use client';
import { useCallback, useEffect, useState } from 'react';
import { erc20Abi } from 'viem';
import { useAccount, useConfig, useSwitchChain, useWriteContract } from 'wagmi';
import { readContract, waitForTransactionReceipt } from 'wagmi/actions';
import { questEscrowAbi } from '@perkify/contracts';
import type { Quest } from '@perkify/db';
import { orpc, errorMessage, errorCode } from '@/lib/orpc';

export type FundStep = 'idle' | 'prepare' | 'approve' | 'create' | 'confirm' | 'done';
export const FUND_STEP_ORDER = ['prepare', 'approve', 'create', 'confirm'] as const;

type Stored = { createTx: `0x${string}`; chainId: number };
const storageKey = (questId: string) => `perkify:fund:${questId}`;

function loadStored(questId: string): Stored | null {
  try {
    const raw = localStorage.getItem(storageKey(questId));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function saveStored(questId: string, s: Stored) {
  try {
    localStorage.setItem(storageKey(questId), JSON.stringify(s));
  } catch {}
}
function clearStored(questId: string) {
  try {
    localStorage.removeItem(storageKey(questId));
  } catch {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** El RPC de la API puede ir un poco detrás del de la wallet: reintenta si aún no ve la tx. */
async function confirmWithRetry(chainId: number, txHash: string): Promise<Quest> {
  for (let i = 0; ; i++) {
    try {
      return (await orpc.quests.confirm({ chainId, txHash })) as Quest;
    } catch (e) {
      if (i < 4 && errorCode(e) === 'NOT_FOUND') {
        await sleep(2500);
        continue;
      }
      throw e;
    }
  }
}

/**
 * Fondeo de un borrador: prepare → approve (si hace falta) → createQuest → confirm.
 * Se puede relanzar: si ya hay un createQuest enviado (guardado en localStorage) salta directo a confirm.
 */
export function useFundQuest(questId: string) {
  const config = useConfig();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<FundStep>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [hasSavedTx, setHasSavedTx] = useState(false);

  useEffect(() => {
    setHasSavedTx(loadStored(questId) !== null);
  }, [questId]);

  const finish = (q: Quest) => {
    clearStored(questId);
    setHasSavedTx(false);
    setQuest(q);
    setStep('done');
  };

  const run = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (!address) throw new Error('Connect your wallet first.');

      // Reanudar: la tx de createQuest ya se envió, solo falta enlazarla.
      const stored = loadStored(questId);
      if (stored) {
        setStep('confirm');
        finish(await confirmWithRetry(stored.chainId, stored.createTx));
        return;
      }

      setStep('prepare');
      const prep = await orpc.quests.prepare({ id: questId });
      const targetChain = prep.chainId;
      if (chainId !== targetChain) await switchChainAsync({ chainId: targetChain });

      const contract = prep.contract as `0x${string}`;
      const token = prep.call.token as `0x${string}`;
      const reward = BigInt(prep.call.reward);

      const balance = await readContract(config, {
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
        chainId: targetChain,
      });
      if (balance < reward) throw new Error("You don't have enough balance to fund this quest.");

      setStep('approve');
      const allowance = await readContract(config, {
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, contract],
        chainId: targetChain,
      });
      if (allowance < reward) {
        const approveHash = await writeContractAsync({
          address: token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contract, reward],
          chainId: targetChain,
        });
        const approveReceipt = await waitForTransactionReceipt(config, {
          hash: approveHash,
          chainId: targetChain,
        });
        if (approveReceipt.status !== 'success') throw new Error('The token approval failed.');
      }

      setStep('create');
      // Los args vienen tal cual de prepare. Si TypeScript se queja del ancho de algún uint,
      // ajusta BigInt(...) ↔ number según el ABI generado.
      const createHash = await writeContractAsync({
        address: contract,
        abi: questEscrowAbi,
        functionName: 'createQuest',
        args: [
          token,
          reward,
          BigInt(prep.call.deadline),
          BigInt(prep.call.refundGrace),
          BigInt(prep.call.reviewWindow),
          prep.call.uri,
        ],
        chainId: targetChain,
      });
      saveStored(questId, { createTx: createHash, chainId: targetChain });
      setHasSavedTx(true);

      const receipt = await waitForTransactionReceipt(config, { hash: createHash, chainId: targetChain });
      if (receipt.status !== 'success') {
        clearStored(questId);
        setHasSavedTx(false);
        throw new Error('The transaction reverted on-chain. Nothing was charged except gas; you can try again.');
      }

      setStep('confirm');
      finish(await confirmWithRetry(targetChain, createHash));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId, config, questId, switchChainAsync, writeContractAsync]);

  /** Descarta la tx guardada (p. ej. si revirtió) para volver a empezar desde prepare. */
  const forgetSavedTx = useCallback(() => {
    clearStored(questId);
    setHasSavedTx(false);
    setError(null);
    setStep('idle');
  }, [questId]);

  return { step, busy, error, quest, hasSavedTx, run, forgetSavedTx };
}
