import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome completo é obrigatório' })
  @MaxLength(150, {
    message: 'O nome completo deve possuir no máximo 150 caracteres',
  })
  fullName!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsNotEmpty({
    message: 'O telefone usado para login é obrigatório',
  })
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'Informe o telefone com 8 a 15 números e, opcionalmente, o código internacional iniciado por +',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Informe um telefone alternativo válido',
  })
  alternativePhone?: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(6, {
    message: 'A senha deve possuir pelo menos 6 caracteres',
  })
  @MaxLength(100)
  password!: string;

  @IsEnum(UserRole, {
    message: 'O perfil informado é inválido',
  })
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}