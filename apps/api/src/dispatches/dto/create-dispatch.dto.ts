import {
  DispatchPriority,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDispatchDto {
  @IsOptional()
  @IsUUID()
  alertId?: string;

  @IsUUID()
  motorcycleId!: string;

  @IsOptional()
  @IsUUID()
  policeOfficerId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(DispatchPriority)
  priority?: DispatchPriority;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}