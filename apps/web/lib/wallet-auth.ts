import type { SignInChain } from "@perkify/auth/sign-in-chains";
import {
  BaseError,
  createWalletClient,
  custom,
  SwitchChainError,
  UserRejectedRequestError,
} from "viem";
import type { EIP1193Provider } from "viem";
import { createSiweMessage } from "viem/siwe";

import { authClient } from "@/lib/auth-client";

declare global {
  interface Window {
    ethereum?: Pick<EIP1193Provider, "request">;
  }
}

export async function signInWithWallet(chain: SignInChain): Promise<void> {
  if (!window.ethereum) {
    throw new Error(
      "No wallet detected. Please install MetaMask or another wallet extension."
    );
  }

  const wallet = createWalletClient({
    transport: custom(window.ethereum, { retryCount: 0 }),
  });

  try {
    await wallet.requestAddresses();

    if ((await wallet.getChainId()) !== chain.id) {
      try {
        await wallet.switchChain({ id: chain.id });
      } catch (error) {
        if (!(error instanceof SwitchChainError)) throw error;
        await wallet.addChain({ chain });
        if ((await wallet.getChainId()) !== chain.id) {
          await wallet.switchChain({ id: chain.id });
        }
      }
    }

    const [address] = await wallet.getAddresses();
    if (!address) {
      throw new Error("The wallet did not return any account.");
    }

    const { data: nonceData, error: nonceError } = await authClient.siwe.nonce(
      {}
    );
    if (nonceError || !nonceData) {
      throw new Error(nonceError?.message ?? "Could not get a sign-in nonce.");
    }
    if ((await wallet.getChainId()) !== chain.id) {
      throw new Error(
        "Switch your wallet to the selected network and try again."
      );
    }

    const message = createSiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to Perkify.",
      uri: window.location.origin,
      version: "1",
      chainId: chain.id,
      nonce: nonceData.nonce,
      issuedAt: new Date(),
    });

    const signature = await wallet.signMessage({ account: address, message });
    const { error: verifyError } = await authClient.siwe.verify({
      message,
      signature,
    });
    if (verifyError) {
      throw new Error(verifyError.message ?? "Signature verification failed.");
    }
  } catch (error) {
    if (
      error instanceof BaseError &&
      error.walk((cause) => cause instanceof UserRejectedRequestError)
    ) {
      throw new Error("Sign-in cancelled.");
    }
    throw error;
  }
}
