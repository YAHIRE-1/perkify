import { createConfig, http } from "wagmi";
import { arbitrum, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [sepolia, arbitrum],
  ssr: true,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
  },
});