import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@Injectable()
export class GeofencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateGeofenceDto) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    if (dto.radiusMeters <= 0) {
      throw new BadRequestException('Raio deve ser maior que zero');
    }

    if (dto.centerLat < -90 || dto.centerLat > 90) {
      throw new BadRequestException('Latitude inválida');
    }

    if (dto.centerLng < -180 || dto.centerLng > 180) {
      throw new BadRequestException('Longitude inválida');
    }

    const geofence = await this.prisma.geofence.create({
      data: {
        motorcycleId: dto.motorcycleId,
        name: dto.name,
        type: dto.type,
        shape: dto.shape ?? 'CIRCLE',
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusMeters: dto.radiusMeters,
        isActive: dto.isActive ?? true,
      },
      include: {
        motorcycle: true,
      },
    });

    await this.auditService.create({
      action: 'CREATE_GEOFENCE',
      entity: 'Geofence',
      entityId: geofence.id,
      newData: geofence,
    });

    return geofence;
  }

  async findAll() {
    return this.prisma.geofence.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async findById(id: string) {
    const geofence = await this.prisma.geofence.findUnique({
      where: { id },
      include: {
        motorcycle: true,
      },
    });

    if (!geofence) {
      throw new NotFoundException('Geofence não encontrada');
    }

    return geofence;
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.geofence.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async update(id: string, dto: UpdateGeofenceDto) {
    const oldGeofence = await this.findById(id);

    if (dto.radiusMeters !== undefined && dto.radiusMeters <= 0) {
      throw new BadRequestException('Raio deve ser maior que zero');
    }

    if (
      dto.centerLat !== undefined &&
      (dto.centerLat < -90 || dto.centerLat > 90)
    ) {
      throw new BadRequestException('Latitude inválida');
    }

    if (
      dto.centerLng !== undefined &&
      (dto.centerLng < -180 || dto.centerLng > 180)
    ) {
      throw new BadRequestException('Longitude inválida');
    }

    const geofence = await this.prisma.geofence.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        shape: dto.shape,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusMeters: dto.radiusMeters,
        isActive: dto.isActive,
      },
      include: {
        motorcycle: true,
      },
    });

    await this.auditService.create({
      action: 'UPDATE_GEOFENCE',
      entity: 'Geofence',
      entityId: id,
      oldData: oldGeofence,
      newData: geofence,
    });

    return geofence;
  }

  async remove(id: string) {
    const geofence = await this.findById(id);

    await this.auditService.create({
      action: 'DELETE_GEOFENCE',
      entity: 'Geofence',
      entityId: id,
      oldData: geofence,
    });

    return this.prisma.geofence.delete({
      where: { id },
    });
  }
}