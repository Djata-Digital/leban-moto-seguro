import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
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

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : value;
}

export class CreateRecoveryEvidenceDto {
  @IsString()
  dispatchId!: string;

  @IsOptional()
  @IsString()
  policeOfficerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

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