import { IsUUID, IsEthereumAddress } from 'class-validator';

export class PrepareDepositDto {
  @IsUUID()
  questId: string;

  @IsEthereumAddress()
  payerAddress: string;

  @IsEthereumAddress()
  receiverAddress: string;
}