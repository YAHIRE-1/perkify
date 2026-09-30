/** @type {import('next').NextConfig} */
const nextConfig = {
  // wagmi/@wagmi/core empaquetan soporte nativo para chains y wallets que
  // no usamos (Base Account/x402, Tempo, y opcionalmente WalletConnect).
  // Estos imports son código muerto en nuestra app (solo usamos `injected`
  // sobre Arbitrum/Sepolia), pero el bundler igual exige resolverlos.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Base Account / pagos x402 (Coinbase) - no usado
      '@x402/evm/upto/client': false,
      '@x402/evm': false,
      '@x402/core': false,
      '@x402/svm': false,
      '@x402/extensions': false,
      // Tempo chain (SDK de cuentas de Tempo) - no usado, no operamos esa chain
      'accounts': false,
    };
    return config;
  },
};

module.exports = nextConfig;