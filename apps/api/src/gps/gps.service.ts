import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGpsDeviceDto } from './dto/create-gps-device.dto';
import { CreateGpsLocationDto } from './dto/create-gps-location.dto';
import { EventEngineService } from '../event-engine/event-engine.service';
import { GpsHistoryQueryDto } from './dto/gps-history-query.dto';

@Injectable()
export class GpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEngineService: EventEngineService,
  ) {}

  async createDevice(dto: CreateGpsDeviceDto) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    const existingDevice = await this.prisma.gpsDevice.findUnique({
      where: { imei: dto.imei },
    });

    if (existingDevice) {
      throw new BadRequestException('Já existe rastreador com este IMEI');
    }

    const device = await this.prisma.gpsDevice.create({
      data: {
        motorcycleId: dto.motorcycleId,
        imei: dto.imei,
        simNumber: dto.simNumber,
        provider: dto.provider,
        deviceModel: dto.deviceModel,
        hasBackupBattery: dto.hasBackupBattery ?? true,
        isActive: true,
      },
      include: {
        motorcycle: true,
      },
    });

    await this.auditService.create({
      action: 'CREATE_GPS_DEVICE',
      entity: 'GpsDevice',
      entityId: device.id,
      newData: device,
    });

    return device;
  }

  async findDevices() {
    return this.prisma.gpsDevice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findDeviceById(id: string) {
    const device = await this.prisma.gpsDevice.findUnique({
      where: { id },
      include: {
        motorcycle: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Rastreador não encontrado');
    }

    return device;
  }

  async findDevicesByMotorcycle(motorcycleId: string) {
    return this.prisma.gpsDevice.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async createLocation(dto: CreateGpsLocationDto) {
    const device = await this.prisma.gpsDevice.findUnique({
      where: { id: dto.gpsDeviceId },
      include: {
        motorcycle: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Rastreador não encontrado');
    }

    if (!device.isActive) {
      throw new BadRequestException('Rastreador está inativo');
    }

    if (dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Latitude inválida');
    }

    if (dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Longitude inválida');
    }

    const location = await this.prisma.gpsLocation.create({
      data: {
        gpsDeviceId: dto.gpsDeviceId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        battery: dto.battery,
        ignitionOn: dto.ignitionOn,
        signalLevel: dto.signalLevel,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
      include: {
        gpsDevice: {
          include: {
            motorcycle: true,
          },
        },
      },
    });

    await this.eventEngineService.handleGpsLocationCreated({
      device,
      location,
    });

    return location;
  }

  async getLastLocationByMotorcycle(motorcycleId: string) {
    const device = await this.prisma.gpsDevice.findFirst({
      where: {
        motorcycleId,
        isActive: true,
      },
      include: {
        motorcycle: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Esta mota não possui rastreador ativo');
    }

    const lastLocation = device.locations[0] ?? null;

    return {
      motorcycle: device.motorcycle,
      gpsDevice: {
        id: device.id,
        imei: device.imei,
        simNumber: device.simNumber,
        provider: device.provider,
        deviceModel: device.deviceModel,
        isActive: device.isActive,
        hasBackupBattery: device.hasBackupBattery,
      },
      lastLocation,
    };
  }

  async getHistoryByMotorcycle(
    motorcycleId: string,
    query?: GpsHistoryQueryDto,
  ) {
    const whereRecordedAt: any = {};

    if (query?.startDate) {
      whereRecordedAt.gte = new Date(query.startDate);
    }

    if (query?.endDate) {
      whereRecordedAt.lte = new Date(query.endDate);
    }

    const limit = query?.limit ? Number(query.limit) : 500;

    const devices = await this.prisma.gpsDevice.findMany({
      where: { motorcycleId },
      include: {
        motorcycle: true,
        locations: {
          where: Object.keys(whereRecordedAt).length
            ? { recordedAt: whereRecordedAt }
            : undefined,
          orderBy: { recordedAt: 'asc' },
          take: limit,
        },
      },
    });

    if (!devices.length) {
      throw new NotFoundException('Esta mota não possui rastreador cadastrado');
    }

    return devices;
  }

  async deactivateDevice(id: string) {
    const device = await this.findDeviceById(id);

    const updated = await this.prisma.gpsDevice.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        motorcycle: true,
      },
    });

    await this.auditService.create({
      action: 'DEACTIVATE_GPS_DEVICE',
      entity: 'GpsDevice',
      entityId: id,
      oldData: device,
      newData: updated,
    });

    return updated;
  }

  async activateDevice(id: string) {
    await this.findDeviceById(id);

    return this.prisma.gpsDevice.update({
      where: { id },
      data: {
        isActive: true,
      },
      include: {
        motorcycle: true,
      },
    });
  }
}