import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { GpsLocationEventDto } from './dto/gps-location-event.dto';
import { GeofenceEngineService } from '../geofence-engine/geofence-engine.service';

@Injectable()
export class EventEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly geofenceEngineService: GeofenceEngineService,
  ) {}

  async handleGpsLocationCreated(dto: GpsLocationEventDto) {
    await this.checkTheftGpsSignal(dto.device, dto.location);
    await this.checkLowGpsBattery(dto.device, dto.location);
    await this.checkExcessiveSpeed(dto.device, dto.location);
    await this.geofenceEngineService.checkMotorcycleLocation(
      dto.device,
      dto.location,
    );
  }

  private async checkTheftGpsSignal(device: any, location: any) {
    const motorcycleId = device.motorcycleId;

    const openTheftReport = await this.prisma.theftReport.findFirst({
      where: {
        motorcycleId,
        status: {
          in: ['OPEN', 'INVESTIGATING'],
        },
      },
    });

    if (!openTheftReport) return;

    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        motorcycleId,
        type: 'THEFT_GPS_SIGNAL',
        status: 'OPEN',
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'THEFT_GPS_SIGNAL',
      severity: 'CRITICAL',
      title: 'Mota com ocorrência voltou a transmitir GPS',
      message:
        'Uma mota com ocorrência aberta enviou nova localização GPS.',
      motorcycleId,
      gpsDeviceId: device.id,
      theftReportId: openTheftReport.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        plateNumber: device.motorcycle?.plateNumber,
        speed: location.speed,
        battery: location.battery,
        recordedAt: location.recordedAt,
      },
    });
  }

  private async checkLowGpsBattery(device: any, location: any) {
    if (typeof location.battery !== 'number') return;
    if (location.battery >= 20) return;

    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        gpsDeviceId: device.id,
        type: 'LOW_GPS_BATTERY',
        status: 'OPEN',
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'LOW_GPS_BATTERY',
      severity: 'HIGH',
      title: 'Bateria baixa do rastreador',
      message: 'O rastreador GPS está com bateria abaixo de 20%.',
      motorcycleId: device.motorcycleId,
      gpsDeviceId: device.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        battery: location.battery,
        plateNumber: device.motorcycle?.plateNumber,
        recordedAt: location.recordedAt,
      },
    });
  }

  private async checkExcessiveSpeed(device: any, location: any) {
    if (typeof location.speed !== 'number') return;
    if (location.speed < 90) return;

    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        motorcycleId: device.motorcycleId,
        type: 'MANUAL_ALERT',
        status: 'OPEN',
        title: 'Velocidade excessiva',
      },
    });

    if (existingAlert) return;

    await this.alertsService.create({
      type: 'MANUAL_ALERT',
      severity: 'MEDIUM',
      title: 'Velocidade excessiva',
      message: 'A mota ultrapassou o limite configurado de 90 km/h.',
      motorcycleId: device.motorcycleId,
      gpsDeviceId: device.id,
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: {
        speed: location.speed,
        plateNumber: device.motorcycle?.plateNumber,
        recordedAt: location.recordedAt,
      },
    });
  }
}