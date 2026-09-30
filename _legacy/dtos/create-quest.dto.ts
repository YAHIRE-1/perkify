import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  IsNumberString,
  IsEthereumAddress,
  IsDateString,
} from 'class-validator';

export class CreateQuestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  validationChecklist: string[];

  @IsNumberString()
  rewardAmount: string;

  @IsString()
  @IsNotEmpty()
  acceptedTokenSymbol: string;

  @IsEthereumAddress()
  acceptedTokenAddress: string;

  @IsDateString()
  deadline: string;
}