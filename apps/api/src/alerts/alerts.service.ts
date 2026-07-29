import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateAlertDto) {
    const alert = await this.prisma.alert.create({
      data: {
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        motorcycleId: dto.motorcycleId,
        gpsDeviceId: dto.gpsDeviceId,
        theftReportId: dto.theftReportId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        metadata: dto.metadata,
      },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });

    await this.auditService.create({
      action: 'CREATE_ALERT',
      entity: 'Alert',
      entityId: alert.id,
      newData: alert,
    });

    this.realtimeGateway.emitAlertCreated(alert);
    this.realtimeGateway.emitDashboardUpdated({
      type: 'ALERT_CREATED',
      alertId: alert.id,
    });

    return alert;
  }

  async findAll() {
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });
  }

  async findOpen() {
    return this.prisma.alert.findMany({
      where: { status: AlertStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.alert.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });
  }

  async findById(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alerta não encontrado');
    }

    return alert;
  }

  async acknowledge(id: string, dto: UpdateAlertStatusDto) {
    const oldAlert = await this.findById(id);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        metadata: {
          ...(oldAlert.metadata as any),
          acknowledgeNote: dto.note,
        },
      },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });

    await this.auditService.create({
      action: 'ACKNOWLEDGE_ALERT',
      entity: 'Alert',
      entityId: id,
      oldData: oldAlert,
      newData: alert,
    });

    this.realtimeGateway.emitAlertUpdated(alert);
    this.realtimeGateway.emitDashboardUpdated({
      type: 'ALERT_ACKNOWLEDGED',
      alertId: alert.id,
    });

    return alert;
  }

  async resolve(id: string, dto: UpdateAlertStatusDto) {
    const oldAlert = await this.findById(id);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        metadata: {
          ...(oldAlert.metadata as any),
          resolveNote: dto.note,
        },
      },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });

    await this.auditService.create({
      action: 'RESOLVE_ALERT',
      entity: 'Alert',
      entityId: id,
      oldData: oldAlert,
      newData: alert,
    });

    this.realtimeGateway.emitAlertUpdated(alert);
    this.realtimeGateway.emitDashboardUpdated({
      type: 'ALERT_RESOLVED',
      alertId: alert.id,
    });

    return alert;
  }

  async dismiss(id: string, dto: UpdateAlertStatusDto) {
    const oldAlert = await this.findById(id);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.DISMISSED,
        resolvedAt: new Date(),
        metadata: {
          ...(oldAlert.metadata as any),
          dismissNote: dto.note,
        },
      },
      include: {
        motorcycle: true,
        gpsDevice: true,
        theftReport: true,
      },
    });

    await this.auditService.create({
      action: 'DISMISS_ALERT',
      entity: 'Alert',
      entityId: id,
      oldData: oldAlert,
      newData: alert,
    });

    this.realtimeGateway.emitAlertUpdated(alert);
    this.realtimeGateway.emitDashboardUpdated({
      type: 'ALERT_DISMISSED',
      alertId: alert.id,
    });

    return alert;
  }
}