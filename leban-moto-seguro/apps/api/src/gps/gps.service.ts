import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGpsDeviceDto } from './dto/create-gps-device.dto';
import { CreateGpsLocationDto } from './dto/create-gps-location.dto';
import { UpdateGpsDeviceDto } from './dto/update-gps-device.dto';
import { EventEngineService } from '../event-engine/event-engine.service';
import { GpsHistoryQueryDto } from './dto/gps-history-query.dto';

const deviceInclude = {
  motorcycle: {
    include: {
      owner: true,
    },
  },
  locations: {
    orderBy: { recordedAt: 'desc' as const },
    take: 1,
  },
};

@Injectable()
export class GpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEngineService: EventEngineService,
  ) {}

  private cleanOptional(value?: string) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private async ensureMotorcycleExists(motorcycleId: string) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }
  }

  private async ensureNoActiveDevice(
    motorcycleId: string,
    ignoreDeviceId?: string,
  ) {
    const existing = await this.prisma.gpsDevice.findFirst({
      where: {
        motorcycleId,
        isActive: true,
        ...(ignoreDeviceId ? { id: { not: ignoreDeviceId } } : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Esta mota já possui um dispositivo GPS ativo',
      );
    }
  }

  async createDevice(dto: CreateGpsDeviceDto) {
    await this.ensureMotorcycleExists(dto.motorcycleId);
    await this.ensureNoActiveDevice(dto.motorcycleId);

    const existingDevice = await this.prisma.gpsDevice.findUnique({
      where: { imei: dto.imei.trim() },
    });

    if (existingDevice) {
      throw new BadRequestException('Já existe rastreador com este IMEI');
    }

    if (dto.iccid) {
      const existingIccid = await this.prisma.gpsDevice.findUnique({
        where: { iccid: dto.iccid.trim() },
      });

      if (existingIccid) {
        throw new BadRequestException('Já existe rastreador com este ICCID');
      }
    }

    const device = await this.prisma.gpsDevice.create({
      data: {
        motorcycleId: dto.motorcycleId,
        imei: dto.imei.trim(),
        simNumber: this.cleanOptional(dto.simNumber),
        iccid: this.cleanOptional(dto.iccid),
        provider: this.cleanOptional(dto.provider),
        apn: this.cleanOptional(dto.apn),
        deviceModel: this.cleanOptional(dto.deviceModel),
        firmwareVersion: this.cleanOptional(dto.firmwareVersion),
        hasBackupBattery: dto.hasBackupBattery ?? true,
        isActive: true,
      },
      include: deviceInclude,
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
      include: deviceInclude,
    });
  }

  async findDeviceById(id: string) {
    const device = await this.prisma.gpsDevice.findUnique({
      where: { id },
      include: {
        motorcycle: { include: { owner: true } },
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

  async updateDevice(id: string, dto: UpdateGpsDeviceDto) {
    const existing = await this.findDeviceById(id);
    const motorcycleId = dto.motorcycleId ?? existing.motorcycleId;

    await this.ensureMotorcycleExists(motorcycleId);

    if (existing.isActive) {
      await this.ensureNoActiveDevice(motorcycleId, id);
    }

    if (dto.imei && dto.imei.trim() !== existing.imei) {
      const duplicate = await this.prisma.gpsDevice.findUnique({
        where: { imei: dto.imei.trim() },
      });
      if (duplicate) {
        throw new BadRequestException('Já existe rastreador com este IMEI');
      }
    }

    if (dto.iccid && dto.iccid.trim() !== existing.iccid) {
      const duplicate = await this.prisma.gpsDevice.findUnique({
        where: { iccid: dto.iccid.trim() },
      });
      if (duplicate) {
        throw new BadRequestException('Já existe rastreador com este ICCID');
      }
    }

    const updated = await this.prisma.gpsDevice.update({
      where: { id },
      data: {
        ...(dto.motorcycleId !== undefined && {
          motorcycleId: dto.motorcycleId,
        }),
        ...(dto.imei !== undefined && { imei: dto.imei.trim() }),
        ...(dto.simNumber !== undefined && {
          simNumber: this.cleanOptional(dto.simNumber),
        }),
        ...(dto.iccid !== undefined && {
          iccid: this.cleanOptional(dto.iccid),
        }),
        ...(dto.provider !== undefined && {
          provider: this.cleanOptional(dto.provider),
        }),
        ...(dto.apn !== undefined && { apn: this.cleanOptional(dto.apn) }),
        ...(dto.deviceModel !== undefined && {
          deviceModel: this.cleanOptional(dto.deviceModel),
        }),
        ...(dto.firmwareVersion !== undefined && {
          firmwareVersion: this.cleanOptional(dto.firmwareVersion),
        }),
        ...(dto.hasBackupBattery !== undefined && {
          hasBackupBattery: dto.hasBackupBattery,
        }),
      },
      include: deviceInclude,
    });

    await this.auditService.create({
      action: 'UPDATE_GPS_DEVICE',
      entity: 'GpsDevice',
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async findDevicesByMotorcycle(motorcycleId: string) {
    return this.prisma.gpsDevice.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: deviceInclude,
    });
  }

  async createLocation(dto: CreateGpsLocationDto) {
    const device = await this.prisma.gpsDevice.findUnique({
      where: { id: dto.gpsDeviceId },
      include: { motorcycle: true },
    });

    if (!device) throw new NotFoundException('Rastreador não encontrado');
    if (!device.isActive) throw new BadRequestException('Rastreador está inativo');
    if (dto.latitude < -90 || dto.latitude > 90) throw new BadRequestException('Latitude inválida');
    if (dto.longitude < -180 || dto.longitude > 180) throw new BadRequestException('Longitude inválida');

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    const location = await this.prisma.$transaction(async (tx) => {
      const created = await tx.gpsLocation.create({
        data: {
          gpsDeviceId: dto.gpsDeviceId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          speed: dto.speed,
          battery: dto.battery,
          ignitionOn: dto.ignitionOn,
          signalLevel: dto.signalLevel,
          recordedAt,
        },
        include: {
          gpsDevice: { include: { motorcycle: true } },
        },
      });

      await tx.gpsDevice.update({
        where: { id: dto.gpsDeviceId },
        data: {
          lastCommunicationAt: recordedAt,
          ...(dto.battery !== undefined && { batteryLevel: dto.battery }),
          ...(dto.signalLevel !== undefined && {
            signalStrength: dto.signalLevel,
          }),
        },
      });

      return created;
    });

    await this.eventEngineService.handleGpsLocationCreated({ device, location });
    return location;
  }

  async getLastLocationByMotorcycle(motorcycleId: string) {
    const device = await this.prisma.gpsDevice.findFirst({
      where: { motorcycleId, isActive: true },
      include: {
        motorcycle: true,
        locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    if (!device) {
      throw new NotFoundException('Esta mota não possui rastreador ativo');
    }

    return {
      motorcycle: device.motorcycle,
      gpsDevice: {
        id: device.id,
        imei: device.imei,
        simNumber: device.simNumber,
        iccid: device.iccid,
        provider: device.provider,
        apn: device.apn,
        deviceModel: device.deviceModel,
        firmwareVersion: device.firmwareVersion,
        isActive: device.isActive,
        hasBackupBattery: device.hasBackupBattery,
        lastCommunicationAt: device.lastCommunicationAt,
        batteryLevel: device.batteryLevel,
        signalStrength: device.signalStrength,
      },
      lastLocation: device.locations[0] ?? null,
    };
  }

  async getHistoryByMotorcycle(motorcycleId: string, query?: GpsHistoryQueryDto) {
    const whereRecordedAt: any = {};
    if (query?.startDate) whereRecordedAt.gte = new Date(query.startDate);
    if (query?.endDate) whereRecordedAt.lte = new Date(query.endDate);
    const limit = query?.limit ? Number(query.limit) : 500;

    const devices = await this.prisma.gpsDevice.findMany({
      where: { motorcycleId },
      include: {
        motorcycle: true,
        locations: {
          where: Object.keys(whereRecordedAt).length ? { recordedAt: whereRecordedAt } : undefined,
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
      data: { isActive: false },
      include: deviceInclude,
    });

    await this.auditService.create({
      action: 'DEACTIVATE_GPS_DEVICE', entity: 'GpsDevice', entityId: id,
      oldData: device, newData: updated,
    });
    return updated;
  }

  async activateDevice(id: string) {
    const device = await this.findDeviceById(id);
    await this.ensureNoActiveDevice(device.motorcycleId, id);

    const updated = await this.prisma.gpsDevice.update({
      where: { id },
      data: { isActive: true },
      include: deviceInclude,
    });

    await this.auditService.create({
      action: 'ACTIVATE_GPS_DEVICE', entity: 'GpsDevice', entityId: id,
      oldData: device, newData: updated,
    });
    return updated;
  }
}
