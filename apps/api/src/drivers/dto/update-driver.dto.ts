import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateDriverDto {
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
   * Novos documentos enviados durante uma atualização.
   */
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @IsOptional()
  @IsString()
  drivingLicenseDocumentUrl?: string;
}