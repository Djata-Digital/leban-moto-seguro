import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MotorcycleCondition } from '@prisma/client';

function transformBoolean(value: unknown) {
  return value === true || value === 'true';
}

function transformNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}

export class CreateRecoveryReportDto {
  @IsString()
  dispatchId!: string;

  @IsOptional()
  @IsString()
  policeOfficerId?: string;

  @IsEnum(MotorcycleCondition)
  motorcycleCondition!: MotorcycleCondition;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  detailedReport!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  policeReportNumber?: string;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  keyFound!: boolean;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  arrestOccurred!: boolean;

  @Transform(({ value }) => Number(value ?? 0))
  @IsInt()
  @Min(0)
  @Max(100)
  suspectsCount!: number;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  confrontation!: boolean;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  injuredPeople!: boolean;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  ownerPresent!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recoveredObjects?: string;

  @Transform(({ value }) => transformNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @Transform(({ value }) => transformNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}