import { getAddress } from 'viem';
import { createSiweMessage } from 'viem/siwe';
import { authClient } from '@/lib/auth-client';

declare global {
  interface Window {
    ethereum?: {
      request: (a: { method: string; params?: unknown[] }) => Promise<any>;
    };
  }
}

const USER_REJECTED_CODE = 4001;

export async function signInWithWallet(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or another wallet extension.');
  }

  try {
    // 1. Connect wallet
    const accounts: string[] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    if (!accounts?.[0]) {
      throw new Error('The wallet did not return any account.');
    }
    const address = getAddress(accounts[0]);

    // Use whatever chain the wallet is currently on (no forced switch)
    const chainId = parseInt(
      await window.ethereum.request({ method: 'eth_chainId' }),
      16
    );

    // 2. Get nonce
    // 2. Get nonce (no body in this version)
    const { data: nonceData, error: nonceError } = await authClient.siwe.nonce({});
    if (nonceError || !nonceData) {
      throw new Error(nonceError?.message ?? 'Could not get a sign-in nonce.');
    }
    // 3. Build SIWE message (statement must be plain ASCII per EIP-4361)
    const message = createSiweMessage({
      domain: window.location.host, // must match SIWE_DOMAIN on the server
      address,
      statement: 'Sign in to Perkify.',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce: nonceData.nonce,
      issuedAt: new Date(),
    });

    // 4. Ask the wallet to sign
    const signature: `0x${string}` = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });

    // 5. Verify on the server (better-auth sets the session cookie)
    const { error: verifyError } = await authClient.siwe.verify({
      message,
      signature,
    });
    if (verifyError) {
      throw new Error(verifyError.message ?? 'Signature verification failed.');
    }
  } catch (e: any) {
    if (e?.code === USER_REJECTED_CODE) {
      throw new Error('Sign-in cancelled.');
    }
    console.error('[wallet-auth] sign-in failed:', e);
    throw e;
  }
}