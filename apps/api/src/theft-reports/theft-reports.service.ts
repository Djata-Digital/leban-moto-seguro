import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MotorcycleStatus,
  TheftReportStatus,
  TheftReportType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTheftReportDto } from './dto/create-theft-report.dto';
import { UpdateTheftReportDto } from './dto/update-theft-report.dto';

@Injectable()
export class TheftReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private mapReportTypeToMotorcycleStatus(type: TheftReportType) {
    if (type === TheftReportType.FURTO) return MotorcycleStatus.STOLEN;
    if (type === TheftReportType.ROUBO) return MotorcycleStatus.ROBBED;
    return MotorcycleStatus.INVESTIGATION;
  }

  async create(dto: CreateTheftReportDto) {
    if (!dto.motorcycleId) {
      throw new BadRequestException(
        'O ID da mota é obrigatório para criar a ocorrência.',
      );
    }
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    const openReport = await this.prisma.theftReport.findFirst({
      where: {
        motorcycleId: dto.motorcycleId,
        status: {
          in: [
            TheftReportStatus.OPEN,
            TheftReportStatus.INVESTIGATING,
          ],
        },
      },
    });

    if (openReport) {
      throw new BadRequestException(
        'Esta mota já possui uma ocorrência aberta',
      );
    }

    const newMotorcycleStatus = this.mapReportTypeToMotorcycleStatus(dto.type);

    const result = await this.prisma.$transaction(async (tx) => {
      const report = await tx.theftReport.create({
        data: {
          motorcycleId: dto.motorcycleId,
          type: dto.type,
          description: dto.description,
          reportNumber: dto.reportNumber,
          locationText: dto.locationText,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: TheftReportStatus.OPEN,
        },
        include: {
          motorcycle: true,
        },
      });

      await tx.motorcycle.update({
        where: { id: dto.motorcycleId },
        data: {
          status: newMotorcycleStatus,
        },
      });

      await tx.routeAuthorization.updateMany({
        where: {
          motorcycleId: dto.motorcycleId,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        data: {
          status: 'CANCELLED',
          ownerDecisionNote:
            'Autorização cancelada automaticamente por ocorrência de furto/roubo/desaparecimento',
        },
      });

      return report;
    });

    await this.auditService.create({
      action: 'CREATE_THEFT_REPORT',
      entity: 'TheftReport',
      entityId: result.id,
      newData: result,
    });

    return {
      message:
        'Ocorrência criada. Status da mota atualizado e autorizações ativas canceladas.',
      report: result,
    };
  }

  async findAll() {
    return this.prisma.theftReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: {
          include: {
            owner: true,
            driverLinks: {
              where: { isActive: true },
              include: {
                driver: true,
              },
            },
            gpsDevices: {
              where: { isActive: true },
              include: {
                locations: {
                  orderBy: { recordedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  async findOpen() {
    return this.prisma.theftReport.findMany({
      where: {
        status: {
          in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: {
          include: {
            owner: true,
            driverLinks: {
              where: { isActive: true },
              include: {
                driver: true,
              },
            },
            gpsDevices: {
              where: { isActive: true },
              include: {
                locations: {
                  orderBy: { recordedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.theftReport.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
      },
    });
  }

  async findById(id: string) {
    const report = await this.prisma.theftReport.findUnique({
      where: { id },
      include: {
        motorcycle: {
          include: {
            owner: true,
            driverLinks: {
              where: { isActive: true },
              include: {
                driver: true,
              },
            },
            gpsDevices: {
              where: { isActive: true },
              include: {
                locations: {
                  orderBy: { recordedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    return report;
  }

  async update(id: string, dto: UpdateTheftReportDto) {
    const oldReport = await this.findById(id);

    const updated = await this.prisma.theftReport.update({
      where: { id },
      data: {
        status: dto.status,
        description: dto.description,
        reportNumber: dto.reportNumber,
        locationText: dto.locationText,
        latitude: dto.latitude,
        longitude: dto.longitude,
        recoveredAt: dto.recoveredAt ? new Date(dto.recoveredAt) : undefined,
      },
      include: {
        motorcycle: true,
      },
    });

    await this.auditService.create({
      action: 'UPDATE_THEFT_REPORT',
      entity: 'TheftReport',
      entityId: id,
      oldData: oldReport,
      newData: updated,
    });

    return updated;
  }

  async markRecovered(id: string) {
    const report = await this.findById(id);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.theftReport.update({
        where: { id },
        data: {
          status: TheftReportStatus.RECOVERED,
          recoveredAt: new Date(),
        },
        include: {
          motorcycle: true,
        },
      });

      await tx.motorcycle.update({
        where: { id: report.motorcycleId },
        data: {
          status: MotorcycleStatus.RECOVERED,
        },
      });

      return updatedReport;
    });

    await this.auditService.create({
      action: 'MARK_MOTORCYCLE_RECOVERED',
      entity: 'TheftReport',
      entityId: id,
      oldData: report,
      newData: result,
    });

    return {
      message: 'Mota marcada como recuperada.',
      report: result,
    };
  }

  async close(id: string) {
    const report = await this.findById(id);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.theftReport.update({
        where: { id },
        data: {
          status: TheftReportStatus.CLOSED,
        },
        include: {
          motorcycle: true,
        },
      });

      await tx.motorcycle.update({
        where: { id: report.motorcycleId },
        data: {
          status: MotorcycleStatus.ACTIVE,
        },
      });

      return updatedReport;
    });

    await this.auditService.create({
      action: 'CLOSE_THEFT_REPORT',
      entity: 'TheftReport',
      entityId: id,
      oldData: report,
      newData: result,
    });

    return {
      message: 'Ocorrência encerrada e mota reativada.',
      report: result,
    };
  }
}