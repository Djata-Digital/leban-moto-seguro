import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePoliceOfficerDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome completo é obrigatório' })
  @MaxLength(150)
  fullName!: string;

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

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(6, {
    message: 'A senha deve possuir pelo menos 6 caracteres',
  })
  @MaxLength(100)
  password!: string;

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
