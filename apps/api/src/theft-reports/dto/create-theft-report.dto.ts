import { TheftReportType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function optionalNumber(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return Number(value);
}

export class CreateTheftReportDto {
  @IsUUID()
  motorcycleId!: string;

  @IsEnum(TheftReportType)
  type!: TheftReportType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reportNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationText?: string;

  @IsOptional()
  @Transform(({ value }) =>
    optionalNumber(value),
  )
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) =>
    optionalNumber(value),
  )
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}