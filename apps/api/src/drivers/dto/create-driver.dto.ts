import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDriverDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  drivingLicenseNumber?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  /*
   * Estes campos não existem diretamente em Driver.
   * Eles são recebidos para criar DriverDocument.
   */
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @IsOptional()
  @IsString()
  drivingLicenseDocumentUrl?: string;
}