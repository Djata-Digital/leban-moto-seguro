import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdatePoliceOfficerDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'Informe o telefone com 8 a 15 números e, opcionalmente, o código internacional iniciado por +',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  identityNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  stationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
