import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PoliceAccessType, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    if (!dto.password) {
      throw new BadRequestException('A senha é obrigatória');
    }

    if (!dto.phone) {
      throw new BadRequestException(
        'O telefone usado para login é obrigatório',
      );
    }

    const fullName = dto.fullName.trim();
    const phone = dto.phone.trim();
    const email = dto.email?.trim().toLowerCase() || null;
    const alternativePhone =
      dto.alternativePhone?.trim() || null;
    const photoUrl = dto.photoUrl?.trim() || null;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        throw new BadRequestException(
          'Já existe um usuário com este telefone',
        );
      }

      throw new BadRequestException(
        'Já existe um usuário com este e-mail',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        alternativePhone,
        photoUrl,
        passwordHash,
        role: dto.role,
        policeAccessType:
          dto.role === UserRole.POLICIA
            ? PoliceAccessType.PATROL
            : null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        alternativePhone: true,
        photoUrl: true,
        role: true,
        policeAccessType: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        alternativePhone: true,
        photoUrl: true,
        role: true,
        policeAccessType: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        alternativePhone: true,
        photoUrl: true,
        role: true,
        policeAccessType: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findByEmailOrPhone(login: string) {
    const normalizedLogin = login.trim();

    return this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedLogin.toLowerCase(),
          },
          {
            phone: normalizedLogin,
          },
        ],
      },
      include: {
        policeProfile: {
          select: {
            id: true,
          },
        },
      },
    });
  }
}