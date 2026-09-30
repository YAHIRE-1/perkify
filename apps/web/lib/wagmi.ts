import { http, createConfig } from 'wagmi';
import { arbitrum, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Ajusta según tus etapas: local/staging en Sepolia, producción en Arbitrum One.
// Si vas a soportar WalletConnect además de MetaMask/inyectada, agrega el
// connector walletConnect({ projectId: '...' }) aquí.
export const config = createConfig({
  chains: [arbitrum, sepolia],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}