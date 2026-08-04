import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateDriverMotorcycleLinkDto {
  @IsUUID()
  @IsNotEmpty()
  driverId!: string;

  @IsUUID()
  @IsNotEmpty()
  motorcycleId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
