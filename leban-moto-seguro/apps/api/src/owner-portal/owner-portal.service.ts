import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DispatchEventType,
  DispatchPriority,
  DispatchStatus,
  MotorcycleStatus,
  TheftReportStatus,
  TheftReportType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeOwnerPasswordDto } from './dto/change-owner-password.dto';
import { CreateOwnerTheftReportDto } from './dto/create-owner-theft-report.dto';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';

@Injectable()
export class OwnerPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnerByUserId(userId: string) {
    const owner = await this.prisma.owner.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!owner) {
      throw new ForbiddenException('Usuário não possui perfil de proprietário');
    }

    return owner;
  }

  async getProfile(userId: string) {
    const owner = await this.prisma.owner.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            alternativePhone: true,
            photoUrl: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!owner) {
      throw new ForbiddenException('Usuário não possui perfil de proprietário');
    }

    const [motorcycles, alerts, incidents] = await Promise.all([
      this.prisma.motorcycle.count({ where: { ownerId: owner.id } }),
      this.prisma.alert.count({ where: { motorcycle: { ownerId: owner.id } } }),
      this.prisma.theftReport.count({ where: { motorcycle: { ownerId: owner.id } } }),
    ]);

    return {
      id: owner.id,
      userId: owner.userId,
      fullName: owner.fullName || owner.user.fullName,
      birthDate: owner.birthDate,
      identityNumber: owner.identityNumber,
      phone: owner.phone ?? owner.user.phone,
      alternativePhone: owner.user.alternativePhone,
      email: owner.email ?? owner.user.email,
      nationality: owner.nationality,
      country: owner.country,
      address: owner.address,
      photoUrl: owner.photoUrl ?? owner.user.photoUrl,
      status: owner.user.status,
      role: owner.user.role,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
      documents: owner.documents,
      statistics: { motorcycles, alerts, incidents },
    };
  }

  async updateProfile(userId: string, dto: UpdateOwnerProfileDto) {
    const owner = await this.getOwnerByUserId(userId);
    const fullName = dto.fullName?.trim();
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    if (email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Este e-mail já está em uso.');
    }

    if (phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone, id: { not: userId } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Este telefone já está em uso.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          email: email ?? null,
          phone: phone ?? null,
          alternativePhone: dto.alternativePhone?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
        },
      }),
      this.prisma.owner.update({
        where: { id: owner.id },
        data: {
          fullName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          identityNumber: dto.identityNumber?.trim() || null,
          phone: phone ?? null,
          email: email ?? null,
          nationality: dto.nationality?.trim() || null,
          country: dto.country?.trim() || null,
          address: dto.address?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
        },
      }),
    ]);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangeOwnerPasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('A senha atual está incorreta.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Senha alterada com sucesso.' };
  }

  async getDashboard(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycles = await this.prisma.motorcycle.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        gpsDevices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const motorcycleIds = motorcycles.map((item) => item.id);
    const [openAlerts, openReports, recentAlerts] = await Promise.all([
      this.prisma.alert.count({
        where: { motorcycleId: { in: motorcycleIds }, status: 'OPEN' },
      }),
      this.prisma.theftReport.count({
        where: { motorcycleId: { in: motorcycleIds }, status: { in: ['OPEN', 'INVESTIGATING'] } },
      }),
      this.prisma.alert.findMany({
        where: { motorcycleId: { in: motorcycleIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { motorcycle: { select: { plateNumber: true } } },
      }),
    ]);

    const summaries = motorcycles.map((motorcycle) => {
      const device = motorcycle.gpsDevices[0] ?? null;
      const lastLocation = device?.locations[0] ?? null;
      return {
        id: motorcycle.id,
        plateNumber: motorcycle.plateNumber,
        nationalCode: motorcycle.nationalCode,
        brand: motorcycle.brand,
        model: motorcycle.model,
        color: motorcycle.color,
        status: motorcycle.status,
        photoUrl: motorcycle.photoUrl,
        gpsOnline: Boolean(device && lastLocation),
        lastLocation,
      };
    });

    return {
      totals: {
        motorcycles: summaries.length,
        movingMotorcycles: summaries.filter((item) => (item.lastLocation?.speed ?? 0) > 3).length,
        stoppedMotorcycles: summaries.filter((item) => item.lastLocation && (item.lastLocation.speed ?? 0) <= 3).length,
        openAlerts,
        openReports,
      },
      motorcycles: summaries,
      recentAlerts,
    };
  }

  async getMotorcycles(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycles = await this.prisma.motorcycle.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        gpsDevices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { locations: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        },
        driverLinks: {
          where: { isActive: true },
          take: 1,
          include: { driver: { select: { id: true, fullName: true, phone: true, photoUrl: true } } },
        },
        theftReports: { orderBy: { reportedAt: 'desc' }, take: 1 },
      },
    });

    return motorcycles.map((motorcycle) => {
      const device = motorcycle.gpsDevices[0] ?? null;
      return {
        ...motorcycle,
        gpsDevice: device
          ? {
              id: device.id,
              isActive: device.isActive,
              provider: device.provider,
              deviceModel: device.deviceModel,
              lastLocation: device.locations[0] ?? null,
            }
          : null,
        currentDriver: motorcycle.driverLinks[0]?.driver ?? null,
        latestTheftReport: motorcycle.theftReports[0] ?? null,
        gpsDevices: undefined,
        driverLinks: undefined,
        theftReports: undefined,
      };
    });
  }


  async getDrivers(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const links = await this.prisma.driverMotorcycleLink.findMany({
      where: {
        motorcycle: { ownerId: owner.id },
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
      include: {
        motorcycle: {
          select: {
            id: true,
            nationalCode: true,
            plateNumber: true,
            brand: true,
            model: true,
            color: true,
            photoUrl: true,
            status: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                phone: true,
                photoUrl: true,
                status: true,
              },
            },
            documents: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const drivers = new Map<string, {
      id: string;
      fullName: string;
      birthDate: Date | null;
      identityNumber: string | null;
      drivingLicenseNumber: string | null;
      phone: string | null;
      email: string | null;
      nationality: string | null;
      country: string | null;
      address: string | null;
      photoUrl: string | null;
      accountStatus: string;
      documents: typeof links[number]['driver']['documents'];
      activeMotorcycles: Array<typeof links[number]['motorcycle'] & { linkId: string; startDate: Date }>;
      history: Array<{
        linkId: string;
        motorcycle: typeof links[number]['motorcycle'];
        startDate: Date;
        endDate: Date | null;
        isActive: boolean;
      }>;
    }>();

    for (const link of links) {
      const current = drivers.get(link.driver.id) ?? {
        id: link.driver.id,
        fullName: link.driver.fullName || link.driver.user.fullName,
        birthDate: link.driver.birthDate,
        identityNumber: link.driver.identityNumber,
        drivingLicenseNumber: link.driver.drivingLicenseNumber,
        phone: link.driver.phone || link.driver.user.phone,
        email: link.driver.email || link.driver.user.email,
        nationality: link.driver.nationality,
        country: link.driver.country,
        address: link.driver.address,
        photoUrl: link.driver.photoUrl || link.driver.user.photoUrl,
        accountStatus: String(link.driver.user.status),
        documents: link.driver.documents,
        activeMotorcycles: [],
        history: [],
      };

      current.history.push({
        linkId: link.id,
        motorcycle: link.motorcycle,
        startDate: link.startDate,
        endDate: link.endDate,
        isActive: link.isActive,
      });

      if (link.isActive) {
        current.activeMotorcycles.push({
          ...link.motorcycle,
          linkId: link.id,
          startDate: link.startDate,
        });
      }

      drivers.set(link.driver.id, current);
    }

    const items = Array.from(drivers.values()).sort((a, b) => {
      const activeDifference = b.activeMotorcycles.length - a.activeMotorcycles.length;
      return activeDifference || a.fullName.localeCompare(b.fullName, 'pt');
    });

    return {
      totals: {
        drivers: items.length,
        activeDrivers: items.filter((driver) => driver.activeMotorcycles.length > 0).length,
        inactiveDrivers: items.filter((driver) => driver.activeMotorcycles.length === 0).length,
        activeLinks: links.filter((link) => link.isActive).length,
      },
      drivers: items,
    };
  }

  async getTracking(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycles = await this.prisma.motorcycle.findMany({
      where: { ownerId: owner.id },
      orderBy: { plateNumber: 'asc' },
      select: {
        id: true,
        nationalCode: true,
        plateNumber: true,
        brand: true,
        model: true,
        color: true,
        status: true,
        photoUrl: true,
        gpsDevices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            imei: true,
            provider: true,
            deviceModel: true,
            isActive: true,
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                latitude: true,
                longitude: true,
                speed: true,
                battery: true,
                ignitionOn: true,
                signalLevel: true,
                recordedAt: true,
              },
            },
          },
        },
      },
    });

    const now = Date.now();

    return motorcycles.map((motorcycle) => {
      const device = motorcycle.gpsDevices[0] ?? null;
      const location = device?.locations[0] ?? null;
      const ageMs = location
        ? now - new Date(location.recordedAt).getTime()
        : Number.POSITIVE_INFINITY;

      return {
        id: motorcycle.id,
        nationalCode: motorcycle.nationalCode,
        plateNumber: motorcycle.plateNumber,
        brand: motorcycle.brand,
        model: motorcycle.model,
        color: motorcycle.color,
        status: motorcycle.status,
        photoUrl: motorcycle.photoUrl,
        gpsDevice: device
          ? {
              id: device.id,
              imei: device.imei,
              provider: device.provider,
              deviceModel: device.deviceModel,
              isActive: device.isActive,
              online: Boolean(location && ageMs <= 5 * 60 * 1000),
              lastLocation: location,
            }
          : null,
      };
    });
  }

  async getMotorcycleLocation(userId: string, motorcycleId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycle = await this.prisma.motorcycle.findFirst({
      where: { id: motorcycleId, ownerId: owner.id },
      select: {
        id: true,
        nationalCode: true,
        plateNumber: true,
        brand: true,
        model: true,
        color: true,
        status: true,
        gpsDevices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            imei: true,
            provider: true,
            deviceModel: true,
            isActive: true,
            hasBackupBattery: true,
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                latitude: true,
                longitude: true,
                speed: true,
                battery: true,
                ignitionOn: true,
                signalLevel: true,
                recordedAt: true,
              },
            },
          },
        },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException(
        'Mota não encontrada ou não pertence a este proprietário',
      );
    }

    const device = motorcycle.gpsDevices[0] ?? null;
    const location = device?.locations[0] ?? null;
    const ageMs = location
      ? Date.now() - new Date(location.recordedAt).getTime()
      : Number.POSITIVE_INFINITY;

    return {
      id: motorcycle.id,
      nationalCode: motorcycle.nationalCode,
      plateNumber: motorcycle.plateNumber,
      brand: motorcycle.brand,
      model: motorcycle.model,
      color: motorcycle.color,
      status: motorcycle.status,
      gpsDevice: device
        ? {
            id: device.id,
            imei: device.imei,
            provider: device.provider,
            deviceModel: device.deviceModel,
            isActive: device.isActive,
            hasBackupBattery: device.hasBackupBattery,
            online: Boolean(location && ageMs <= 5 * 60 * 1000),
            lastLocation: location,
          }
        : null,
    };
  }

  async getMotorcycleById(userId: string, motorcycleId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycle = await this.prisma.motorcycle.findFirst({
      where: { id: motorcycleId, ownerId: owner.id },
      include: {
        owner: {
          include: {
            user: { select: { fullName: true, email: true, phone: true, photoUrl: true } },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        gpsDevices: {
          orderBy: { createdAt: 'desc' },
          include: { locations: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        },
        driverLinks: {
          orderBy: { createdAt: 'desc' },
          include: {
            driver: {
              include: {
                user: { select: { fullName: true, email: true, phone: true, photoUrl: true } },
                documents: { orderBy: { createdAt: 'desc' } },
              },
            },
          },
        },
        theftReports: { orderBy: { reportedAt: 'desc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
        policeChecks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada ou não pertence a este proprietário');
    }

    const activeDevice = motorcycle.gpsDevices.find((device) => device.isActive) ?? motorcycle.gpsDevices[0] ?? null;

    return {
      ...motorcycle,
      gpsDevice: activeDevice
        ? {
            id: activeDevice.id,
            imei: activeDevice.imei,
            simNumber: activeDevice.simNumber,
            provider: activeDevice.provider,
            deviceModel: activeDevice.deviceModel,
            isActive: activeDevice.isActive,
            hasBackupBattery: activeDevice.hasBackupBattery,
            lastLocation: activeDevice.locations[0] ?? null,
          }
        : null,
      gpsDevices: undefined,
    };
  }

  private toDate(value: string | undefined, fallback: Date) {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed;
  }

  private distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const radius = 6371;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * radius * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  }

  private buildTrip(points: Array<{
    id: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    battery: number | null;
    ignitionOn: boolean | null;
    signalLevel: number | null;
    recordedAt: Date;
  }>) {
    let distanceKm = 0;
    let movingMs = 0;
    let stoppedMs = 0;
    let maxSpeed = 0;
    const events: Array<{ type: string; title: string; recordedAt: Date; latitude: number; longitude: number }> = [];

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      maxSpeed = Math.max(maxSpeed, point.speed ?? 0);
      if ((point.speed ?? 0) >= 80) {
        events.push({ type: 'SPEEDING', title: `Excesso de velocidade: ${Math.round(point.speed ?? 0)} km/h`, recordedAt: point.recordedAt, latitude: point.latitude, longitude: point.longitude });
      }
      if (point.battery != null && point.battery < 20) {
        events.push({ type: 'LOW_BATTERY', title: `Bateria baixa: ${Math.round(point.battery)}%`, recordedAt: point.recordedAt, latitude: point.latitude, longitude: point.longitude });
      }
      if (index === 0) continue;
      const previous = points[index - 1];
      const interval = point.recordedAt.getTime() - previous.recordedAt.getTime();
      distanceKm += this.distanceKm(previous, point);
      if ((point.speed ?? 0) > 3) movingMs += interval;
      else stoppedMs += interval;
      if (interval > 15 * 60 * 1000) {
        events.push({ type: 'GPS_GAP', title: `GPS sem comunicação por ${Math.round(interval / 60000)} minutos`, recordedAt: point.recordedAt, latitude: point.latitude, longitude: point.longitude });
      }
      if (previous.ignitionOn !== point.ignitionOn && point.ignitionOn != null) {
        events.push({ type: point.ignitionOn ? 'IGNITION_ON' : 'IGNITION_OFF', title: point.ignitionOn ? 'Ignição ligada' : 'Ignição desligada', recordedAt: point.recordedAt, latitude: point.latitude, longitude: point.longitude });
      }
    }

    const start = points[0];
    const end = points[points.length - 1];
    const durationMs = Math.max(0, end.recordedAt.getTime() - start.recordedAt.getTime());
    const averageSpeed = movingMs > 0 ? distanceKm / (movingMs / 3600000) : 0;

    return {
      id: `${start.id}.${end.id}`,
      startedAt: start.recordedAt,
      endedAt: end.recordedAt,
      durationSeconds: Math.round(durationMs / 1000),
      movingSeconds: Math.round(movingMs / 1000),
      stoppedSeconds: Math.round(stoppedMs / 1000),
      distanceKm: Number(distanceKm.toFixed(2)),
      averageSpeed: Number(averageSpeed.toFixed(1)),
      maxSpeed: Number(maxSpeed.toFixed(1)),
      startLocation: { latitude: start.latitude, longitude: start.longitude },
      endLocation: { latitude: end.latitude, longitude: end.longitude },
      pointCount: points.length,
      events,
      points,
    };
  }

  async getRouteHistory(userId: string, motorcycleId: string, startValue?: string, endValue?: string) {
    const owner = await this.getOwnerByUserId(userId);
    const motorcycle = await this.prisma.motorcycle.findFirst({
      where: { id: motorcycleId, ownerId: owner.id },
      select: { id: true, plateNumber: true, nationalCode: true, brand: true, model: true, gpsDevices: { select: { id: true } } },
    });
    if (!motorcycle) throw new NotFoundException('Mota não encontrada ou não pertence a este proprietário');

    const end = this.toDate(endValue, new Date());
    const defaultStart = new Date(end);
    defaultStart.setDate(defaultStart.getDate() - 7);
    const start = this.toDate(startValue, defaultStart);
    const points = await this.prisma.gpsLocation.findMany({
      where: { gpsDeviceId: { in: motorcycle.gpsDevices.map((device) => device.id) }, recordedAt: { gte: start, lte: end } },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, latitude: true, longitude: true, speed: true, battery: true, ignitionOn: true, signalLevel: true, recordedAt: true },
    });

    const groups: typeof points[] = [];
    let current: typeof points = [];
    for (const point of points) {
      const previous = current[current.length - 1];
      const gap = previous ? point.recordedAt.getTime() - previous.recordedAt.getTime() : 0;
      if (previous && gap > 20 * 60 * 1000) {
        if (current.length >= 2) groups.push(current);
        current = [];
      }
      current.push(point);
    }
    if (current.length >= 2) groups.push(current);

    const trips = groups.map((group) => this.buildTrip(group)).reverse();
    return {
      motorcycle: { id: motorcycle.id, plateNumber: motorcycle.plateNumber, nationalCode: motorcycle.nationalCode, brand: motorcycle.brand, model: motorcycle.model },
      period: { start, end },
      summary: {
        trips: trips.length,
        distanceKm: Number(trips.reduce((sum, trip) => sum + trip.distanceKm, 0).toFixed(2)),
        movingSeconds: trips.reduce((sum, trip) => sum + trip.movingSeconds, 0),
        stoppedSeconds: trips.reduce((sum, trip) => sum + trip.stoppedSeconds, 0),
        averageSpeed: trips.length ? Number((trips.reduce((sum, trip) => sum + trip.averageSpeed, 0) / trips.length).toFixed(1)) : 0,
        maxSpeed: trips.reduce((max, trip) => Math.max(max, trip.maxSpeed), 0),
      },
      trips,
    };
  }

  async getRouteDetails(userId: string, motorcycleId: string, routeId: string) {
    const result = await this.getRouteHistory(userId, motorcycleId, '2000-01-01T00:00:00.000Z', new Date().toISOString());
    const trip = result.trips.find((item) => item.id === routeId);
    if (!trip) throw new NotFoundException('Trajeto não encontrado');
    return { motorcycle: result.motorcycle, trip };
  }


  private incidentMotorcycleStatus(type: TheftReportType) {
    if (type === TheftReportType.FURTO) return MotorcycleStatus.STOLEN;
    if (type === TheftReportType.ROUBO) return MotorcycleStatus.ROBBED;
    return MotorcycleStatus.INVESTIGATION;
  }

  async createIncident(userId: string, dto: CreateOwnerTheftReportDto) {
    const owner = await this.getOwnerByUserId(userId);

    const motorcycle = await this.prisma.motorcycle.findFirst({
      where: { id: dto.motorcycleId, ownerId: owner.id },
      select: {
        id: true,
        plateNumber: true,
        nationalCode: true,
        brand: true,
        model: true,
        gpsDevices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: { latitude: true, longitude: true, recordedAt: true },
            },
          },
        },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada para este proprietário');
    }

    const existing = await this.prisma.theftReport.findFirst({
      where: {
        motorcycleId: motorcycle.id,
        status: { in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING] },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ForbiddenException('Esta mota já possui uma ocorrência ativa');
    }

    const latestLocation = motorcycle.gpsDevices[0]?.locations[0] ?? null;
    const latitude = dto.latitude ?? latestLocation?.latitude;
    const longitude = dto.longitude ?? latestLocation?.longitude;

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.theftReport.create({
        data: {
          motorcycleId: motorcycle.id,
          type: dto.type,
          status: TheftReportStatus.OPEN,
          description: dto.description,
          reportNumber: dto.reportNumber,
          locationText: dto.locationText,
          latitude,
          longitude,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          driverName: dto.driverName,
          contactPhone: dto.contactPhone,
          attachments: dto.attachments?.length
            ? { create: dto.attachments }
            : undefined,
          events: {
            create: {
              type: 'CREATED',
              title: 'Ocorrência comunicada pelo proprietário',
              description: 'A Central de Monitoramento recebeu a comunicação.',
              actorUserId: userId,
            },
          },
        },
      });

      await tx.motorcycle.update({
        where: { id: motorcycle.id },
        data: { status: this.incidentMotorcycleStatus(dto.type) },
      });

      await tx.routeAuthorization.updateMany({
        where: {
          motorcycleId: motorcycle.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
        data: {
          status: 'CANCELLED',
          ownerDecisionNote: 'Cancelada automaticamente após comunicação de roubo ou furto.',
        },
      });

      const alert = await tx.alert.create({
        data: {
          type: 'MANUAL_ALERT',
          severity: 'CRITICAL',
          status: 'OPEN',
          title: `Ocorrência: ${motorcycle.plateNumber}`,
          message: `O proprietário comunicou ${dto.type.toLowerCase()} da mota ${motorcycle.brand} ${motorcycle.model}.`,
          motorcycleId: motorcycle.id,
          gpsDeviceId: motorcycle.gpsDevices[0]?.id,
          theftReportId: created.id,
          latitude,
          longitude,
          metadata: {
            source: 'OWNER_PORTAL',
            nationalCode: motorcycle.nationalCode,
          },
        },
      });

      const dispatchCode = `DSP-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const dispatch = await tx.dispatch.create({
        data: {
          code: dispatchCode,
          alertId: alert.id,
          motorcycleId: motorcycle.id,
          title: `Roubo/furto comunicado: ${motorcycle.plateNumber}`,
          description:
            dto.description ??
            `Ocorrência comunicada pelo proprietário para a mota ${motorcycle.brand} ${motorcycle.model}.`,
          priority: DispatchPriority.CRITICAL,
          status: DispatchStatus.OPEN,
          notes: `Criado automaticamente a partir da ocorrência ${created.id}.`,
        },
      });

      await tx.dispatchEvent.create({
        data: {
          dispatchId: dispatch.id,
          type: DispatchEventType.CREATED,
          status: DispatchStatus.OPEN,
          title: 'Despacho criado automaticamente',
          description:
            'A Central Operacional recebeu a ocorrência e abriu um despacho prioritário.',
          latitude,
          longitude,
          metadata: {
            source: 'OWNER_PORTAL',
            theftReportId: created.id,
            alertId: alert.id,
          },
        },
      });

      return created;
    });

    return this.getIncidentById(userId, report.id);
  }

  async getIncidents(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    return this.prisma.theftReport.findMany({
      where: { motorcycle: { ownerId: owner.id } },
      orderBy: { reportedAt: 'desc' },
      include: {
        motorcycle: {
          select: {
            id: true,
            plateNumber: true,
            nationalCode: true,
            brand: true,
            model: true,
            color: true,
            photoUrl: true,
            status: true,
          },
        },

        attachments: true,

        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });
  }

  async getIncidentById(userId: string, incidentId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const incident = await this.prisma.theftReport.findFirst({
      where: { id: incidentId, motorcycle: { ownerId: owner.id } },
      include: {
        motorcycle: {
          include: {
            gpsDevices: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { locations: { orderBy: { recordedAt: 'desc' }, take: 1 } },
            },
          },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!incident) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    return incident;
  }


  async getAlerts(userId: string) {
    const owner = await this.getOwnerByUserId(userId);

    return this.prisma.alert.findMany({
      where: {
        motorcycle: {
          ownerId: owner.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: {
          select: {
            id: true,
            plateNumber: true,
            nationalCode: true,
            brand: true,
            model: true,
            color: true,
            status: true,
            photoUrl: true,
          },
        },
        gpsDevice: {
          select: {
            id: true,
            imei: true,
            provider: true,
            deviceModel: true,
          },
        },
        theftReport: {
          select: {
            id: true,
            type: true,
            status: true,
            reportNumber: true,
          },
        },
      },
    });
  }

  async getAlertById(userId: string, alertId: string) {
    const owner = await this.getOwnerByUserId(userId);

    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        motorcycle: {
          ownerId: owner.id,
        },
      },
      include: {
        motorcycle: {
          include: {
            gpsDevices: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                locations: {
                  orderBy: { recordedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        gpsDevice: true,
        theftReport: true,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alerta não encontrado para este proprietário');
    }

    return alert;
  }

  async acknowledgeAlert(userId: string, alertId: string) {
    const alert = await this.getAlertById(userId, alertId);

    if (alert.status !== 'OPEN') {
      return alert;
    }

    return this.prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        metadata: {
          ...((alert.metadata as Record<string, unknown> | null) ?? {}),
          acknowledgedByOwner: true,
          acknowledgedByOwnerAt: new Date().toISOString(),
        },
      },
      include: {
        motorcycle: {
          select: {
            id: true,
            plateNumber: true,
            nationalCode: true,
            brand: true,
            model: true,
            color: true,
            status: true,
            photoUrl: true,
          },
        },
        gpsDevice: true,
        theftReport: true,
      },
    });
  }

}
