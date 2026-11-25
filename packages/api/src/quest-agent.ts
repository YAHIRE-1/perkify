import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { questEscrowAbi } from "@perkify/contracts/abi";
import { encodeFunctionData, erc20Abi, getAddress } from "viem";
import type { Address, Hex } from "viem";
import { createSiweMessage } from "viem/siwe";
import { z } from "zod";

import type { AppRouterClient, AppRouterOutputs } from "./routers/index";

interface AgentWallet {
  address: Address;
  chainId: number;
  signMessage: (message: string) => Promise<Hex>;
}

interface FundingTransaction {
  chainId: number;
  to: Address;
  data: Hex;
}

const nonceResponse = z.object({ nonce: z.string() });

/** Connect a server-side wallet to the same SIWE session used by the web app. */
export async function connectQuestAgent({
  apiOrigin,
  siteOrigin,
  wallet,
}: {
  apiOrigin: string;
  siteOrigin: string;
  wallet: AgentWallet;
}) {
  const api = new URL(apiOrigin);
  const site = new URL(siteOrigin);
  const address = getAddress(wallet.address);

  async function postAuth(endpoint: "nonce" | "verify", body: string) {
    const response = await fetch(new URL(`/api/auth/siwe/${endpoint}`, api), {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: site.origin },
      redirect: "error",
      body,
    });

    if (!response.ok) {
      throw new Error(`SIWE ${endpoint} failed (HTTP ${response.status}).`);
    }

    return response;
  }

  const nonce = await postAuth("nonce", "{}");

  const message = createSiweMessage({
    address,
    chainId: wallet.chainId,
    domain: site.host,
    uri: site.origin,
    nonce: nonceResponse.parse(await nonce.json()).nonce,
    statement: "Sign in to Perkify.",
    version: "1",
  });

  const response = await postAuth("verify", JSON.stringify({
    message,
    signature: await wallet.signMessage(message),
  }));

  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";", 1)[0]).join("; ");

  if (!cookies) {
    throw new Error("Perkify did not return a SIWE session.");
  }

  const client: AppRouterClient = createORPCClient(
    new RPCLink({
      url: new URL("/rpc", api).href,
      headers: { Cookie: cookies },
      fetch: (request, init) => fetch(request, { ...init, redirect: "error" }),
    }),
  );

  return client;
}

/** Build the two wallet calls from the arguments returned by quests.create. */
export function questFundingTransactions(
  { chainId, escrowAddress, args }: AppRouterOutputs["quests"]["create"]["escrow"],
) {
  const token = getAddress(args.token);
  const reward = BigInt(args.reward);

  return {
    approval: {
      chainId,
      to: token,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [escrowAddress, reward],
      }),
    },
    deposit: {
      chainId,
      to: escrowAddress,
      data: encodeFunctionData({
        abi: questEscrowAbi,
        functionName: "createQuest",
        args: [token, reward, BigInt(args.deadline), args.uri],
      }),
    },
  } satisfies Record<"approval" | "deposit", FundingTransaction>;
}
