import { MotorcycleType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMotorcycleDto {
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;

  @IsEnum(MotorcycleType)
  type!: MotorcycleType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  chassisNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engineNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  plateNumber!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}