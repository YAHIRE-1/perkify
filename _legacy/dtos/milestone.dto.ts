import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class MilestoneDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del hito no puede estar vacía' })
  @MaxLength(280)
  description: string;
}