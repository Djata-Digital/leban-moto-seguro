import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  policeAccessType?: string;
  policeOfficerId?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET não definido no .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      policeAccessType: payload.policeAccessType,
      policeOfficerId: payload.policeOfficerId,
    };
  }
}