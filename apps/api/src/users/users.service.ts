import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  PoliceAccessType,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

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
        OR: [{ phone }, ...(email ? [{ email }] : [])],
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

    return this.prisma.user.create({
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
      select: userSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        photoUrl: true,
        role: true,
        ownerProfile: { select: { id: true } },
        driverProfile: { select: { id: true } },
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const fullName = dto.fullName?.trim();
    const phone = dto.phone?.trim();
    const email =
      dto.email === undefined
        ? undefined
        : dto.email?.trim().toLowerCase() || null;
    const alternativePhone =
      dto.alternativePhone === undefined
        ? undefined
        : dto.alternativePhone?.trim() || null;
    const photoUrl =
      dto.photoUrl === undefined
        ? undefined
        : dto.photoUrl?.trim() || null;

    if (fullName !== undefined && !fullName) {
      throw new BadRequestException(
        'O nome completo não pode ficar vazio',
      );
    }

    if (phone !== undefined && !phone) {
      throw new BadRequestException(
        'O telefone usado para login não pode ficar vazio',
      );
    }

    if (phone || email) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
        select: { phone: true, email: true },
      });

      if (duplicate) {
        if (phone && duplicate.phone === phone) {
          throw new BadRequestException(
            'Já existe um usuário com este telefone',
          );
        }

        throw new BadRequestException(
          'Já existe um usuário com este e-mail',
        );
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    const resultingRole = dto.role ?? currentUser.role;

    const updated = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id },
        data: {
          fullName,
          phone,
          email,
          alternativePhone,
          photoUrl,
          passwordHash,
          role: dto.role,
          status: dto.status,
          policeAccessType:
            dto.role === undefined
              ? undefined
              : resultingRole === UserRole.POLICIA
                ? PoliceAccessType.PATROL
                : null,
        },
        select: userSelect,
      });

      const sharedProfileData = {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      };

      if (
        currentUser.ownerProfile &&
        Object.keys(sharedProfileData).length > 0
      ) {
        await transaction.owner.update({
          where: { userId: id },
          data: sharedProfileData,
        });
      }

      if (
        currentUser.driverProfile &&
        Object.keys(sharedProfileData).length > 0
      ) {
        await transaction.driver.update({
          where: { userId: id },
          data: sharedProfileData,
        });
      }

      return user;
    });

    if (
      photoUrl !== undefined &&
      currentUser.photoUrl &&
      currentUser.photoUrl !== photoUrl
    ) {
      await this.deletePhotoSafely(currentUser.photoUrl);
    }

    return updated;
  }

  async findByEmailOrPhone(login: string) {
    const normalizedLogin = login.trim();

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedLogin.toLowerCase() },
          { phone: normalizedLogin },
        ],
      },
      include: {
        policeProfile: {
          select: { id: true },
        },
      },
    });
  }

  async updatePoliceAccessType(
    userId: string,
    policeAccessType: PoliceAccessType,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { policeAccessType },
      select: {
        id: true,
        policeAccessType: true,
      },
    });
  }

  private async deletePhotoSafely(url: string) {
    try {
      const publicId = this.uploadsService.extractPublicId(url);

      if (!publicId) {
        return;
      }

      await this.uploadsService.deleteFile(publicId, 'image');
    } catch (error) {
      console.error(
        `Não foi possível excluir a foto antiga do usuário: ${url}`,
        error,
      );
    }
  }
}

const userSelect = {
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
} as const;