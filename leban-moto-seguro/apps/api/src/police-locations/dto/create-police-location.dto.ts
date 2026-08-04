import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePoliceLocationDto {
  @IsString()
  policeOfficerId!: string;

  @IsString()
  @IsOptional()
  dispatchId?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @IsNumber()
  @IsOptional()
  speed?: number;

  @IsNumber()
  @IsOptional()
  heading?: number;

  @IsDateString()
  @IsOptional()
  recordedAt?: string;
}