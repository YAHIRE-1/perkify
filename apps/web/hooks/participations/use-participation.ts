import type { AppRouterOutputs } from "@perkify/api/routers/index";
import { questEscrowAbi } from "@perkify/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConfig } from "wagmi";
import { switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ORPCError } from "@orpc/client";

import { client, orpc } from "@/utils/orpc";

export type QuestDetail = AppRouterOutputs["quests"]["get"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : "Algo salió mal.";
  return /user rejected|user denied/i.test(msg) ? "Rechazaste la solicitud en tu wallet." : msg;
}

/* ------------------------------ lectura ------------------------------ */

/** Para el hunter devuelve solo su participación (con sus envíos y motivos de rechazo). */
export function useMyEvidence(questId: string, enabled: boolean) {
  return useQuery({
    ...orpc.quests.getEvidence.queryOptions({ input: { id: questId } }),
    enabled,
  });
}

/* ------------------------------ unirse ------------------------------ */

export function useJoinQuest() {
  const qc = useQueryClient();
  return useMutation(
    orpc.quests.join.mutationOptions({
      onSuccess: async () => {
        toast.success("Te uniste a la quest");
        await qc.invalidateQueries({ queryKey: orpc.quests.key() });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  );
}

/* ------------------------------ evidencia ------------------------------ */

export type SubmitEvidenceInput = {
  questId: string;
  notes: string;
  links: string[];
  files: File[];
};

async function uploadFile(questId: string, file: File) {
  const { key, url } = await client.quests.uploadUrl({
    id: questId,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`No se pudo subir ${file.name}`);
  return { key, name: file.name, contentType: file.type, size: file.size };
}

export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questId, notes, links, files }: SubmitEvidenceInput) => {
      const uploaded = [];
      for (const f of files) uploaded.push(await uploadFile(questId, f)); // en serie: simple y predecible
      return client.quests.submitEvidence({ id: questId, notes, links, files: uploaded });
    },
    onSuccess: async () => {
      toast.success("Evidencia enviada");
      await qc.invalidateQueries({ queryKey: orpc.quests.key() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------ cobrar ------------------------------ */

export type ClaimStep = "idle" | "preparing" | "switching" | "withdrawing" | "confirming";

export const CLAIM_LABEL: Record<ClaimStep, string> = {
  idle: "Claim reward",
  preparing: "Preparing…",
  switching: "Switching network…",
  withdrawing: "Confirm the withdrawal in your wallet…",
  confirming: "Verifying on-chain…",
};

async function confirmPayoutWithRetry(questId: string, txHash: string) {
  for (let i = 0; ; i++) {
    try {
      return await client.quests.confirmPayout({ id: questId, txHash });
    } catch (e) {
      const retryable = e instanceof ORPCError && e.code === "CONFLICT";
      if (!retryable || i >= 3) throw e;
      await sleep(2500);
    }
  }
}

/**
 * claimReward (datos) → cambio de red → withdrawReward (wallet del ganador) → confirmPayout.
 * Si la tx ya se envió pero confirmPayout falló, el reintento salta directo a confirmar.
 * (Si cierra la pestaña, el sincronizador de eventos RewardPaid lo reconcilia.)
 */
export function useClaimReward() {
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const qc = useQueryClient();
  const [step, setStep] = useState<ClaimStep>("idle");
  const sentTx = useRef<Record<string, `0x${string}`>>({});

  const mutation = useMutation({
    mutationFn: async (questId: string) => {
      let hash = sentTx.current[questId];

      if (!hash) {
        if (!address) throw new Error("Connect your wallet first.");

        setStep("preparing");
        const c = await client.quests.claimReward({ id: questId });

        if (address.toLowerCase() !== c.recipient.toLowerCase()) {
          throw new Error(`Connect the wallet you joined with (${short(c.recipient)}).`);
        }

        const chainId = c.chainId as (typeof config.chains)[number]["id"];
        if (walletChainId !== c.chainId) {
          setStep("switching");
          await switchChain(config, { chainId });
        }

        setStep("withdrawing");
        hash = await writeContract(config, {
          address: c.escrowAddress,
          abi: questEscrowAbi,
          functionName: "withdrawReward",
          args: [BigInt(c.escrowId)],
          chainId,
        });
        sentTx.current[questId] = hash;

        const receipt = await waitForTransactionReceipt(config, { hash, chainId });
        if (receipt.status !== "success") {
          delete sentTx.current[questId];
          throw new Error("The withdrawal transaction failed.");
        }
      }

      setStep("confirming");
      await confirmPayoutWithRetry(questId, hash);
      delete sentTx.current[questId];
      return hash;
    },
    onSuccess: async () => {
      toast.success("Recompensa cobrada");
      await qc.invalidateQueries({ queryKey: orpc.quests.key() });
    },
    onError: (e) => toast.error(friendly(e)),
    onSettled: () => setStep("idle"),
  });

  return { ...mutation, step };
}