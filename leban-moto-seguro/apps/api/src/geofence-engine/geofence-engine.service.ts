import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { DistanceService } from './distance.service';

@Injectable()
export class GeofenceEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly distanceService: DistanceService,
  ) {}

  async checkMotorcycleLocation(device: any, location: any) {
    const motorcycleId = device.motorcycleId;

    const geofences = await this.prisma.geofence.findMany({
      where: {
        motorcycleId,
        isActive: true,
      },
    });

    if (!geofences.length) {
      return;
    }

    for (const geofence of geofences) {
      const distanceMeters = this.distanceService.distanceMeters(
        location.latitude,
        location.longitude,
        geofence.centerLat,
        geofence.centerLng,
      );

      const isInside = distanceMeters <= geofence.radiusMeters;

      if (geofence.type === 'ALLOWED_AREA' && !isInside) {
        await this.createOutOfAllowedAreaAlert(
          device,
          location,
          geofence,
          distanceMeters,
        );
      }

      if (geofence.type === 'RESTRICTED_AREA' && isInside) {
        await this.createRestrictedAreaAlert(
          device,
          location,
          geofence,
          distanceMeters,
        );
      }

      if (geofence.type === 'WARNING_AREA' && isInside) {
        await this.createWarningAreaAlert(
          device,
          location,
          geofence,
          distanceMeters,
        );
      }
    }
  }

  private async createOutOfAllowedAreaAlert(
    device: any,
    location: any,
    geofence: any,
    distanceMeters: number,
  ) {
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        motorcycleId: device.motorcycleId,
        type: 'MOTORCYCLE_OUT_OF_ROUTE',
        status: 'OPEN',
        metadata: {
          path: ['geofenceId'],
          equals: geofence.id,
        },
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'MOTORCYCLE_OUT_OF_ROUTE',
      severity: 'HIGH',
      title: 'Mota saiu da área permitida',
      message: `A mota saiu da cerca permitida: ${geofence.name}.`,
      motorcycleId: device.motorcycleId,
      gpsDeviceId: device.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        distanceMeters,
        radiusMeters: geofence.radiusMeters,
        plateNumber: device.motorcycle?.plateNumber,
        recordedAt: location.recordedAt,
      },
    });
  }

  private async createRestrictedAreaAlert(
    device: any,
    location: any,
    geofence: any,
    distanceMeters: number,
  ) {
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        motorcycleId: device.motorcycleId,
        type: 'MOTORCYCLE_OUT_OF_ROUTE',
        status: 'OPEN',
        metadata: {
          path: ['geofenceId'],
          equals: geofence.id,
        },
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'MOTORCYCLE_OUT_OF_ROUTE',
      severity: 'CRITICAL',
      title: 'Mota entrou em área proibida',
      message: `A mota entrou na área proibida: ${geofence.name}.`,
      motorcycleId: device.motorcycleId,
      gpsDeviceId: device.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        distanceMeters,
        radiusMeters: geofence.radiusMeters,
        plateNumber: device.motorcycle?.plateNumber,
        recordedAt: location.recordedAt,
      },
    });
  }

  private async createWarningAreaAlert(
    device: any,
    location: any,
    geofence: any,
    distanceMeters: number,
  ) {
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        motorcycleId: device.motorcycleId,
        type: 'MOTORCYCLE_OUT_OF_ROUTE',
        status: 'OPEN',
        metadata: {
          path: ['geofenceId'],
          equals: geofence.id,
        },
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'MOTORCYCLE_OUT_OF_ROUTE',
      severity: 'MEDIUM',
      title: 'Mota entrou em área de atenção',
      message: `A mota entrou na área de atenção: ${geofence.name}.`,
      motorcycleId: device.motorcycleId,
      gpsDeviceId: device.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        distanceMeters,
        radiusMeters: geofence.radiusMeters,
        plateNumber: device.motorcycle?.plateNumber,
        recordedAt: location.recordedAt,
      },
    });
  }
}