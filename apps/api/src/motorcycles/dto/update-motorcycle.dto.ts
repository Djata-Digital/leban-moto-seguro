import {
  MotorcycleStatus,
  MotorcycleType,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateMotorcycleDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsEnum(MotorcycleType)
  type?: MotorcycleType;

  @IsOptional()
  @IsEnum(MotorcycleStatus)
  status?: MotorcycleStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  chassisNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engineNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}