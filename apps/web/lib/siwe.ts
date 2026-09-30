import { SiweMessage } from 'siwe';
import { getAddress } from 'viem'; // o 'ethers'
import { api } from '@/api/client';

declare global {
  interface Window {
    ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<any> };
  }
}

export async function signInWithWallet(): Promise<string> {
  if (!window.ethereum) throw new Error('No se detectó una wallet. Instala MetaMask u otra extensión.');

  const [rawAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const address = getAddress(rawAddress);

  const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);

  const { nonce } = await api.nonce(address);

  const siweMessage = new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Inicia sesion en Prky.', // statement debe ser ASCII puro (EIP-4361)
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  const message = siweMessage.prepareMessage();

  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  });

  const { accessToken } = await api.verify(message, signature);
  return accessToken;
}