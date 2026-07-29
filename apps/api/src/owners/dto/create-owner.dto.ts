import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOwnerDto {
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
  nationality?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  /*
   * Estes campos são usados somente para receber as URLs
   * dos arquivos enviados pelo frontend.
   *
   * Eles serão salvos na tabela OwnerDocument.
   */
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @IsOptional()
  @IsString()
  purchaseDocumentUrl?: string;
}