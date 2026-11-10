import { ORPCError } from "@orpc/server";
import { privateKeyToAccount } from "viem/accounts";

import { ENV } from "../env";

type Hex = `0x${string}`;

let account: ReturnType<typeof privateKeyToAccount> | null = null;

function getAccount() {
  if (account) return account;
  const acc = privateKeyToAccount(ENV.VOUCHER_SIGNER_KEY as Hex);
  // Si no coincide con el `_signer` del despliegue, el contrato rechazará todas las firmas
  if (
    ENV.VOUCHER_SIGNER_ADDRESS &&
    acc.address.toLowerCase() !== ENV.VOUCHER_SIGNER_ADDRESS.toLowerCase()
  ) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "VOUCHER_SIGNER_KEY no corresponde a VOUCHER_SIGNER_ADDRESS",
    });
  }
  return (account = acc);
}

const VOUCHER_TTL_SECONDS = 15 * 60;

export async function signApproval(p: {
  chainId: number;
  escrowAddress: Hex;
  escrowId: string;
  creator: Hex;
  winner: Hex;
}) {
  const expiry = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;
  const sig = await getAccount().signTypedData({
    domain: {
      name: "QuestEscrow",
      version: "1",
      chainId: p.chainId,
      verifyingContract: p.escrowAddress,
    },
    types: {
      Approval: [
        { name: "id", type: "uint256" },
        { name: "creator", type: "address" },
        { name: "winner", type: "address" },
        { name: "expiry", type: "uint64" },
      ],
    },
    primaryType: "Approval",
    message: {
      id: BigInt(p.escrowId),
      creator: p.creator,
      winner: p.winner,
      expiry: BigInt(expiry),
    },
  });
  return { ...p, expiry, sig };
}
