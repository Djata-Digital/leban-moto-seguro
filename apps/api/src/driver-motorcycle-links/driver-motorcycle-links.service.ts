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

  async create(dto: CreateDriverMotorcycleLinkDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    if (motorcycle.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível vincular motorista a uma mota que não está ativa',
      );
    }

    const existingLink = await this.prisma.driverMotorcycleLink.findUnique({
      where: {
        driverId_motorcycleId: {
          driverId: dto.driverId,
          motorcycleId: dto.motorcycleId,
        },
      },
    });

    if (existingLink && existingLink.isActive) {
      throw new BadRequestException(
        'Este motorista já está vinculado a esta mota',
      );
    }

    if (existingLink && !existingLink.isActive) {
      return this.prisma.driverMotorcycleLink.update({
        where: { id: existingLink.id },
        data: {
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          isActive: true,
        },
        include: {
          driver: true,
          motorcycle: true,
        },
      });
    }

    return this.prisma.driverMotorcycleLink.create({
      data: {
        driverId: dto.driverId,
        motorcycleId: dto.motorcycleId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: true,
      },
      include: {
        driver: true,
        motorcycle: true,
      },
    });
  }

  async findAll() {
    return this.prisma.driverMotorcycleLink.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: true,
        motorcycle: true,
      },
    });
  }

  async findById(id: string) {
    const link = await this.prisma.driverMotorcycleLink.findUnique({
      where: { id },
      include: {
        driver: true,
        motorcycle: true,
      },
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
      include: {
        driver: true,
        motorcycle: true,
      },
    });
  }

  async findByDriver(driverId: string) {
    return this.prisma.driverMotorcycleLink.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: true,
        motorcycle: true,
      },
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
      include: {
        driver: true,
        motorcycle: true,
      },
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
      include: {
        driver: true,
        motorcycle: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.driverMotorcycleLink.delete({
      where: { id },
    });
  }
}