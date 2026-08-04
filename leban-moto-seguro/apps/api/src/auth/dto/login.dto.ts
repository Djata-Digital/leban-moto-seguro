import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({
    message: 'Informe o e-mail ou telefone',
  })
  @MaxLength(150)
  login!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Informe a senha',
  })
  @MinLength(6, {
    message: 'A senha deve possuir pelo menos 6 caracteres',
  })
  @MaxLength(100)
  password!: string;
}