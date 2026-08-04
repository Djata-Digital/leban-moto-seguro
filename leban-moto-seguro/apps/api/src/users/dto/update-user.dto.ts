import { UserRole, UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(150)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'Informe o telefone com 8 a 15 números e, opcionalmente, o código internacional iniciado por +',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Informe um telefone alternativo válido',
  })
  alternativePhone?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(6, {
    message: 'A nova senha deve possuir pelo menos 6 caracteres',
  })
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'O perfil informado é inválido',
  })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'O status informado é inválido',
  })
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string | null;
}