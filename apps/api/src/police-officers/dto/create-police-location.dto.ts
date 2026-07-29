import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
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

export class CreatePoliceLocationDto {
  @IsOptional()
  @IsUUID()
  dispatchId?: string;

  @Transform(({ value }) =>
    Number(value),
  )
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Transform(({ value }) =>
    Number(value),
  )
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @Transform(({ value }) =>
    optionalNumber(value),
  )
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @Transform(({ value }) =>
    optionalNumber(value),
  )
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @Transform(({ value }) =>
    optionalNumber(value),
  )
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}