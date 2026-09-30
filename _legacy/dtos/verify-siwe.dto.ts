import { IsString, IsNotEmpty } from 'class-validator';

export class VerifySiweDto {
  /** Mensaje SIWE en formato EIP-4361 (texto plano tal cual se firmó) */
  @IsString()
  @IsNotEmpty()
  message: string;

  /** Firma hexadecimal producida por la wallet */
  @IsString()
  @IsNotEmpty()
  signature: string;
}
