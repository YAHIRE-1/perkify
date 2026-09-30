import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { QuestStatus } from '../../common/enums/quest-status.enum';

export class FilterQuestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsEnum(QuestStatus)
  status?: QuestStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBoosted?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}