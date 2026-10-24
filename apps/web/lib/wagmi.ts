import { createConfig, http } from "wagmi";
import { arbitrum, arbitrumSepolia, baseSepolia, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [sepolia, arbitrumSepolia, baseSepolia, arbitrum],
  ssr: true,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
  },
});