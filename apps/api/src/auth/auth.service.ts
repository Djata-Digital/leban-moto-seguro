import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const normalizedLogin =
      dto.login.trim().toLowerCase();

    const user =
      await this.usersService.findByEmailOrPhone(
        normalizedLogin,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Login ou senha inválidos',
      );
    }

    const passwordOk = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordOk) {
      throw new UnauthorizedException(
        'Login ou senha inválidos',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Usuário não está ativo',
      );
    }

    const payload = {
      sub: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      policeAccessType: user.policeAccessType,
      policeOfficerId: user.policeProfile?.id,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        policeAccessType: user.policeAccessType,
        policeOfficerId: user.policeProfile?.id,
        status: user.status,
      },
    };
  }
}