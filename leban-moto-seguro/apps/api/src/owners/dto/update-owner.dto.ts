import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateOwnerDto {
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  /*
   * Recebe novos arquivos durante a edição.
   * O serviço atualizará ou criará o OwnerDocument.
   */
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @IsOptional()
  @IsString()
  purchaseDocumentUrl?: string;
}