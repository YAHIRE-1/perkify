/**
 * Utility functions for Web3 interactions.
 */

export async function sendFundingTransaction(txData: {
  to: string;
  data: string;
  value?: string
}): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Ethereum wallet not found. Please install MetaMask or a similar wallet.');
  }

  try {
    // 1. Request accounts to ensure wallet is connected and unlocked
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    // 2. Send the transaction
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from,
        to: txData.to,
        data: txData.data,
        value: txData.value ? `0x${BigInt(txData.value).toString(16)}` : undefined
      }],
    });

    return hash;
  } catch (error: any) {
    // Handle user rejection specifically
    if (error?.code === 4001) {
      throw new Error('Transaction rejected by the user.');
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
