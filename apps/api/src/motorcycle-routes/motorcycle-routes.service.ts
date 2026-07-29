import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMotorcycleRouteDto } from './dto/create-motorcycle-route.dto';
import { UpdateMotorcycleRouteDto } from './dto/update-motorcycle-route.dto';

@Injectable()
export class MotorcycleRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMotorcycleRouteDto) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    if (motorcycle.type !== 'MOTO_TAXI') {
      throw new BadRequestException(
        'Rotas obrigatórias são aplicadas principalmente para mota-táxi',
      );
    }

    if (motorcycle.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível criar rota para mota que não está ativa',
      );
    }

    return this.prisma.motorcycleRoute.create({
      data: {
        motorcycleId: dto.motorcycleId,
        name: dto.name,
        originZone: dto.originZone,
        destinationZone: dto.destinationZone,
        allowedAreas: dto.allowedAreas ?? [],
        allowedDays: dto.allowedDays ?? [],
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: true,
      },
      include: {
        motorcycle: true,
      },
    });
  }

  async findAll() {
    return this.prisma.motorcycleRoute.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async findById(id: string) {
    const route = await this.prisma.motorcycleRoute.findUnique({
      where: { id },
      include: {
        motorcycle: true,
        authorizations: true,
      },
    });

    if (!route) {
      throw new NotFoundException('Rota não encontrada');
    }

    return route;
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.motorcycleRoute.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async findActiveByMotorcycle(motorcycleId: string) {
    return this.prisma.motorcycleRoute.findMany({
      where: {
        motorcycleId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async update(id: string, dto: UpdateMotorcycleRouteDto) {
    await this.findById(id);

    return this.prisma.motorcycleRoute.update({
      where: { id },
      data: {
        name: dto.name,
        originZone: dto.originZone,
        destinationZone: dto.destinationZone,
        allowedAreas: dto.allowedAreas,
        allowedDays: dto.allowedDays,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive,
      },
      include: {
        motorcycle: true,
      },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.motorcycleRoute.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        motorcycle: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.motorcycleRoute.delete({
      where: { id },
    });
  }
}