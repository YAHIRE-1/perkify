import type { AppRouterOutputs } from "@perkify/api/routers/index";
import { questEscrowAbi } from "@perkify/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  simulateContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { ORPCError } from "@orpc/client";

import { client, orpc } from "@/utils/orpc";

export type QuestDetail = AppRouterOutputs["quests"]["get"];
export type QuestEvidence = AppRouterOutputs["quests"]["getEvidence"];


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : "Algo salió mal.";
  return /user rejected|user denied/i.test(msg) ? "Rechazaste la solicitud en tu wallet." : msg;
}

/**
 * Traduce un error de simulateContract / writeContract a un mensaje claro.
 * Los nombres (WrongStatus, NotWinner, …) solo se decodifican si `questEscrowAbi`
 * incluye los `error` del contrato; si no, caerá en el mensaje genérico.
 */
function explainContractError(err: unknown, fallback: string): Error {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      switch (revert.data?.errorName) {
        case "WrongStatus":
          return new Error("The quest is not in the right on-chain state for this action.");
        case "NotWinner":
          return new Error("This wallet is not the winner registered in the contract.");
        default:
          return new Error(
            revert.data?.errorName
              ? `${fallback} (${revert.data.errorName})`
              : `${fallback} (${revert.shortMessage})`,
          );
      }
    }
    // rechazo del usuario u otros errores de viem: dejamos que friendly() decida
    return new Error(err.shortMessage || err.message);
  }
  return err instanceof Error ? err : new Error(fallback);
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
 * claimReward (datos) → cambio de red → simulación → withdrawReward (wallet del ganador) → confirmPayout.
 * Si la tx ya se envió pero confirmPayout falló, el reintento salta directo a confirmar.
 * (Si cierra la pestaña, el sincronizador de eventos RewardPaid lo reconcilia.)
 */
export function useClaimReward() {
  const config = useConfig();
  const { address, chainId: walletChainId, isConnected, status } = useAccount();
  const qc = useQueryClient();
  const [step, setStep] = useState<ClaimStep>("idle");
  const sentTx = useRef<Record<string, `0x${string}`>>({});

  const mutation = useMutation({
    mutationFn: async (questId: string) => {
      console.log("[claim] mutationFn start", {
        questId,
        address,
        isConnected,
        accountStatus: status,
        walletChainId,
        hashPrevio: sentTx.current[questId],
      });

      let hash = sentTx.current[questId];

      if (!hash) {
        if (!address) {
          console.warn("[claim] sin wallet conectada (wagmi)");
          throw new Error("Connect your wallet first.");
        }

        setStep("preparing");
        console.log("[claim] llamando client.quests.claimReward…");
        const c = await client.quests.claimReward({ id: questId });
        console.log("[claim] respuesta claimReward", c, {
          escrowIdType: typeof c.escrowId,
          chainIdType: typeof c.chainId,
        });

        if (address.toLowerCase() !== c.recipient.toLowerCase()) {
          console.warn("[claim] wallet distinta al recipient", {
            conectada: address,
            recipient: c.recipient,
          });
          throw new Error(`Connect the wallet you joined with (${short(c.recipient)}).`);
        }

        const chainId = c.chainId as (typeof config.chains)[number]["id"];
        console.log("[claim] chains configuradas", config.chains.map((x) => x.id), "target", chainId);

        if (walletChainId !== c.chainId) {
          setStep("switching");
          console.log("[claim] switchChain", { desde: walletChainId, hacia: chainId });
          await switchChain(config, { chainId });
          console.log("[claim] switchChain OK");
        }

        // Simular ANTES de pedir la firma: si el contrato va a revertir
        // (WrongStatus / NotWinner / sin fondos…) lo sabemos aquí, sin abrir la wallet.
        setStep("preparing");
        console.log("[claim] simulateContract withdrawReward", {
          address: c.escrowAddress,
          escrowId: c.escrowId,
          chainId,
          account: address,
        });
        let request;
        try {
          ({ request } = await simulateContract(config, {
            address: c.escrowAddress,
            abi: questEscrowAbi,
            functionName: "withdrawReward",
            args: [BigInt(c.escrowId)],
            account: address,
            chainId,
          }));
        } catch (e) {
          console.error("[claim] simulateContract revirtió", e);
          throw explainContractError(e, "The contract rejected the withdrawal");
        }
        console.log("[claim] simulateContract OK");

        setStep("withdrawing");
        try {
          hash = await writeContract(config, request);
        } catch (e) {
          throw explainContractError(e, "The withdrawal could not be sent");
        }
        console.log("[claim] tx enviada", hash);
        sentTx.current[questId] = hash;

        const receipt = await waitForTransactionReceipt(config, { hash, chainId });
        console.log("[claim] receipt", { status: receipt.status, block: receipt.blockNumber });
        if (receipt.status !== "success") {
          delete sentTx.current[questId];
          throw new Error("The withdrawal transaction failed.");
        }
      }

      setStep("confirming");
      console.log("[claim] confirmPayout…", { questId, hash });
      const res = await confirmPayoutWithRetry(questId, hash);
      console.log("[claim] confirmPayout OK", res);
      delete sentTx.current[questId];
      return hash;
    },
    onSuccess: async (hash) => {
      console.log("[claim] onSuccess", hash);
      toast.success("Recompensa cobrada");
      await qc.invalidateQueries({ queryKey: orpc.quests.key() });
    },
    onError: (e) => {
      console.error("[claim] onError", e);
      toast.error(friendly(e));
    },
    onSettled: () => {
      console.log("[claim] onSettled → idle");
      setStep("idle");
    },
  });

  return { ...mutation, step };
}

/** Para el creador devuelve TODAS las participaciones con sus envíos. */
export function useQuestSubmissions(questId: string, enabled: boolean) {
  return useQuery({
    ...orpc.quests.getEvidence.queryOptions({ input: { id: questId } }),
    enabled,
  });
}

/* ------------------------------ revisar ------------------------------ */

export type ReviewStep = "idle" | "preparing" | "switching" | "approving" | "confirming";

export const REVIEW_LABEL: Record<ReviewStep, string> = {
  idle: "Approve",
  preparing: "Preparing…",
  switching: "Switching network…",
  approving: "Confirm the approval in your wallet…",
  confirming: "Syncing…",
};

type ReviewInput =
  | { submissionId: string; decision: "APPROVE" }
  | { submissionId: string; decision: "REJECT"; reason: string };

/**
 * REJECT: una sola llamada a review.
 * APPROVE: review (voucher) → cambio de red → simulación → approve() desde la wallet del creador
 *          → review otra vez (con el contrato en Approved, el servidor marca la BD).
 * Si la tx ya se envió pero la BD aún no sincroniza, el reintento salta directo a sincronizar.
 */
export function useReviewSubmission() {
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const qc = useQueryClient();
  const [step, setStep] = useState<ReviewStep>("idle");
  const sentTx = useRef<Record<string, `0x${string}`>>({});

  const mutation = useMutation({
    mutationFn: async (input: ReviewInput) => {
      setStep("preparing");
      let res = await client.quests.review(input);

      // REJECT, o APPROVE que ya estaba aprobado on-chain y la BD se sincronizó
      if (!("sign" in res)) return res;

      const { sign } = res;

      if (!sentTx.current[input.submissionId]) {
        if (!address) throw new Error("Connect your wallet first.");
        if (address.toLowerCase() !== sign.creator.toLowerCase()) {
          throw new Error(`Connect the wallet that created the quest (${short(sign.creator)}).`);
        }

        const chainId = sign.chainId as (typeof config.chains)[number]["id"];
        if (walletChainId !== sign.chainId) {
          setStep("switching");
          await switchChain(config, { chainId });
        }

        // approve(uint256 id, address winner, uint64 expiry, bytes sig)
        // Simular antes de firmar para detectar firma expirada, estado incorrecto, etc.
        setStep("preparing");
        let request;
        try {
          ({ request } = await simulateContract(config, {
            address: sign.escrowAddress,
            abi: questEscrowAbi,
            functionName: "approve",
            args: [BigInt(sign.escrowId), sign.winner, BigInt(sign.expiry), sign.sig],
            account: address,
            chainId,
          }));
        } catch (e) {
          console.error("[review] simulateContract revirtió", e);
          throw explainContractError(e, "The contract rejected the approval");
        }

        setStep("approving");
        let hash: `0x${string}`;
        try {
          hash = await writeContract(config, request);
        } catch (e) {
          throw explainContractError(e, "The approval could not be sent");
        }
        sentTx.current[input.submissionId] = hash;

        const receipt = await waitForTransactionReceipt(config, { hash, chainId });
        if (receipt.status !== "success") {
          delete sentTx.current[input.submissionId];
          throw new Error("The approval transaction failed.");
        }
      }

      // Con el contrato en Approved, review ahora actualiza la BD.
      // Reintenta por si el RPC del servidor aún no ve el bloque.
      setStep("confirming");
      for (let i = 0; i < 4; i++) {
        res = await client.quests.review(input);
        if (!("sign" in res)) {
          delete sentTx.current[input.submissionId];
          return res;
        }
        await sleep(2500);
      }
      throw new Error("Approved on-chain, but the server hasn't synced yet. Press Approve again.");
    },
    onSuccess: async (_d, vars) => {
      toast.success(vars.decision === "APPROVE" ? "Evidencia aprobada" : "Evidencia rechazada");
      await qc.invalidateQueries({ queryKey: orpc.quests.key() });
    },
    onError: (e) => toast.error(friendly(e)),
    onSettled: () => setStep("idle"),
  });

  return { ...mutation, step };
}
