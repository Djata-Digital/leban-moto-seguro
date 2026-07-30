import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverMotorcycleLinkDto } from './dto/create-driver-motorcycle-link.dto';
import { UpdateDriverMotorcycleLinkDto } from './dto/update-driver-motorcycle-link.dto';

@Injectable()
export class DriverMotorcycleLinksService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly linkInclude = {
    driver: {
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            photoUrl: true,
            status: true,
          },
        },
      },
    },
    motorcycle: {
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    },
  };

  async create(dto: CreateDriverMotorcycleLinkDto) {
    const [driver, motorcycle] = await Promise.all([
      this.prisma.driver.findUnique({
        where: { id: dto.driverId },
        include: { user: true },
      }),
      this.prisma.motorcycle.findUnique({
        where: { id: dto.motorcycleId },
      }),
    ]);

    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    if (motorcycle.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível vincular motorista a uma mota que não está ativa',
      );
    }

    if (driver.user?.status && driver.user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível vincular um motorista com conta inativa',
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.$transaction(async (transaction) => {
      // Uma mota só pode ter um motorista ativo e um motorista só pode
      // conduzir uma mota ativa por vez. Os vínculos anteriores ficam no histórico.
      await transaction.driverMotorcycleLink.updateMany({
        where: {
          isActive: true,
          OR: [
            { motorcycleId: dto.motorcycleId },
            { driverId: dto.driverId },
          ],
        },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      const existingLink =
        await transaction.driverMotorcycleLink.findUnique({
          where: {
            driverId_motorcycleId: {
              driverId: dto.driverId,
              motorcycleId: dto.motorcycleId,
            },
          },
        });

      if (existingLink) {
        return transaction.driverMotorcycleLink.update({
          where: { id: existingLink.id },
          data: {
            startDate,
            endDate,
            isActive: true,
          },
          include: this.linkInclude,
        });
      }

      return transaction.driverMotorcycleLink.create({
        data: {
          driverId: dto.driverId,
          motorcycleId: dto.motorcycleId,
          startDate,
          endDate: endDate ?? undefined,
          isActive: true,
        },
        include: this.linkInclude,
      });
    });
  }

  async findAll() {
    return this.prisma.driverMotorcycleLink.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.linkInclude,
    });
  }

  async findById(id: string) {
    const link = await this.prisma.driverMotorcycleLink.findUnique({
      where: { id },
      include: this.linkInclude,
    });

    if (!link) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return link;
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.driverMotorcycleLink.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: this.linkInclude,
    });
  }

  async findByDriver(driverId: string) {
    return this.prisma.driverMotorcycleLink.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: this.linkInclude,
    });
  }

  async update(id: string, dto: UpdateDriverMotorcycleLinkDto) {
    await this.findById(id);

    return this.prisma.driverMotorcycleLink.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
      },
      include: this.linkInclude,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.driverMotorcycleLink.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
      include: this.linkInclude,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.driverMotorcycleLink.delete({ where: { id } });
  }
}
