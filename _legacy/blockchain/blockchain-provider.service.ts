import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { KLEROS_ESCROW_V2_ABI } from './kleros-escrow.abi';

/**
 * Struct `transactions(id)` del contrato de tokens de Escrow V1, ya serializado
 * (los uint256 llegan como string). Verifica los campos contra TU ABI.
 * `status` es el índice del enum: 0 NoDispute, 1 WaitingSender, 2 WaitingReceiver, 3 DisputeCreated, 4 Resolved.
 */
export interface EscrowTransactionOnChain {
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  timeoutPayment: string;
  disputeId: string;
  senderFee: string;
  receiverFee: string;
  lastInteraction: string;
  status: string;
}

export interface PreparedTx {
  to: string;
  data: string;
  value: string;
}

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

/**
 * Read-only blockchain access. NEVER holds a private key and NEVER signs:
 * it reads on-chain state and builds calldata for the frontend wallet to sign.
 */
@Injectable()
export class BlockchainProviderService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainProviderService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly escrowInterface: ethers.Interface;
  private readonly erc20Interface = new ethers.Interface(ERC20_ABI);
  private readonly escrowAddress: string;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.getOrThrow<string>('RPC_URL_ARBITRUM');
    this.escrowAddress = this.configService.getOrThrow<string>('KLEROS_ESCROW_ADDRESS');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.escrowInterface = new ethers.Interface(KLEROS_ESCROW_V2_ABI);
  }

  /** Detecta al arrancar el error más común: dirección/ABI de una red distinta a la del RPC. */
  async onModuleInit() {
    try {
      const [network, code] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getCode(this.escrowAddress),
      ]);
      this.logger.log(`RPC chainId=${network.chainId}, escrow=${this.escrowAddress}`);
      if (code === '0x') {
        this.logger.error(
          `No hay contrato en ${this.escrowAddress} en chainId ${network.chainId}: dirección o red incorrectas`,
        );
      }
    } catch (err) {
      this.logger.error(`No se pudo verificar el escrow: ${(err as Error).message}`);
    }
  }

  getProvider() { return this.provider; }
  getEscrowAddress() { return this.escrowAddress; }

  private assertAddress(name: string, value: string) {
    if (!ethers.isAddress(value)) {
      throw new BadRequestException(`${name} is not a valid address: ${value}`);
    }
  }

  async getDecimals(token: string): Promise<number> {
    const contract = new ethers.Contract(token, ERC20_ABI, this.provider);
    return Number(await contract.decimals());
  }

  /**
   * Devuelve [approve, createTransaction] para que el wallet firme en orden.
   * `amount` es un decimal legible ("10.5"). Si en tu BD guardas unidades mínimas, usa BigInt directo.
   */
  async buildDepositTxs(params: {
    amount: string;
    tokenAddress: string;
    timeoutPayment: number;
    receiverAddress: string;
    metaEvidenceUri: string;
  }): Promise<PreparedTx[]> {
    this.assertAddress('tokenAddress', params.tokenAddress);
    this.assertAddress('receiverAddress', params.receiverAddress);

    const decimals = await this.getDecimals(params.tokenAddress);
    const amountUnits = ethers.parseUnits(params.amount, decimals);

    return [
      {
        to: params.tokenAddress,
        value: '0',
        data: this.erc20Interface.encodeFunctionData('approve', [this.escrowAddress, amountUnits]),
      },
      {
        to: this.escrowAddress,
        value: '0',
        data: this.escrowInterface.encodeFunctionData('createTransaction', [
          amountUnits,
          params.tokenAddress,
          params.timeoutPayment,
          params.receiverAddress,
          params.metaEvidenceUri,
        ]),
      },
    ];
  }

  /** Lee la transacción on-chain y la devuelve serializable (bigint -> string). */
  async getEscrowTransaction(escrowId: string): Promise<EscrowTransactionOnChain> {
    const contract = new ethers.Contract(this.escrowAddress, KLEROS_ESCROW_V2_ABI, this.provider);
    const result = await contract.transactions(escrowId);
    // toObject() lanza si el ABI tiene outputs sin nombre; en ese caso revisa el ABI.
    return this.serialize(result.toObject()) as EscrowTransactionOnChain;
  }

  private serialize(value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString();
    if (Array.isArray(value)) return value.map((v) => this.serialize(v));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.serialize(v)]));
    }
    return value;
  }
}