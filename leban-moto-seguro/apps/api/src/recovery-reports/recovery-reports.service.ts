import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateRecoveryReportDto } from './dto/create-recovery-report.dto';

@Injectable()
export class RecoveryReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateRecoveryReportDto) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: {
        id: dto.dispatchId,
      },
      select: {
        id: true,
        code: true,
        status: true,
        policeOfficerId: true,
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado.');
    }

    if (dispatch.status === 'CANCELLED') {
      throw new BadRequestException(
        'Um despacho cancelado não pode ser finalizado como recuperação.',
      );
    }

    if (
      dto.policeOfficerId &&
      dispatch.policeOfficerId &&
      dto.policeOfficerId !== dispatch.policeOfficerId
    ) {
      throw new BadRequestException(
        'Este despacho está designado para outro policial.',
      );
    }

    const report = await this.prisma.$transaction(async (transaction) => {
      const recoveryReport = await transaction.recoveryReport.upsert({
        where: {
          dispatchId: dto.dispatchId,
        },
        create: {
          dispatchId: dto.dispatchId,
          policeOfficerId:
            dto.policeOfficerId ??
            dispatch.policeOfficerId ??
            undefined,
          motorcycleCondition: dto.motorcycleCondition,
          detailedReport: dto.detailedReport.trim(),
          policeReportNumber:
            dto.policeReportNumber?.trim() || undefined,
          keyFound: dto.keyFound,
          arrestOccurred: dto.arrestOccurred,
          suspectsCount: dto.suspectsCount,
          confrontation: dto.confrontation,
          injuredPeople: dto.injuredPeople,
          ownerPresent: dto.ownerPresent,
          recoveredObjects:
            dto.recoveredObjects?.trim() || undefined,
          latitude: dto.latitude,
          longitude: dto.longitude,
          completedAt: new Date(),
        },
        update: {
          policeOfficerId:
            dto.policeOfficerId ??
            dispatch.policeOfficerId ??
            undefined,
          motorcycleCondition: dto.motorcycleCondition,
          detailedReport: dto.detailedReport.trim(),
          policeReportNumber:
            dto.policeReportNumber?.trim() || undefined,
          keyFound: dto.keyFound,
          arrestOccurred: dto.arrestOccurred,
          suspectsCount: dto.suspectsCount,
          confrontation: dto.confrontation,
          injuredPeople: dto.injuredPeople,
          ownerPresent: dto.ownerPresent,
          recoveredObjects:
            dto.recoveredObjects?.trim() || undefined,
          latitude: dto.latitude,
          longitude: dto.longitude,
          completedAt: new Date(),
        },
      });

      await transaction.dispatch.update({
        where: {
          id: dto.dispatchId,
        },
        data: {
          status: 'RESOLVED',
          recoveredAt: new Date(),
          resolvedAt: new Date(),
        },
      });

      await transaction.dispatchEvent.create({
        data: {
          dispatchId: dto.dispatchId,
          type: 'RESOLVED',
          status: 'RESOLVED',
          title: 'Recuperação concluída',
          description:
            'O policial concluiu o relatório final da recuperação.',
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });

      return recoveryReport;
    });

    const result = await this.findByDispatch(dto.dispatchId);

    this.realtimeGateway.emitDashboardUpdated({
      type: 'recovery-report.completed',
      dispatchId: dto.dispatchId,
      dispatchCode: dispatch.code,
    });

    this.realtimeGateway.server.emit(
      'recovery-report.completed',
      result,
    );

    return result;
  }

  async findByDispatch(dispatchId: string) {
    const report = await this.prisma.recoveryReport.findUnique({
      where: {
        dispatchId,
      },
      include: {
        policeOfficer: {
          select: {
            id: true,
            fullName: true,
            badgeNumber: true,
            stationName: true,
            phone: true,
          },
        },
        dispatch: {
          include: {
            motorcycle: {
              include: {
                owner: true,
              },
            },
            events: {
              orderBy: {
                createdAt: 'asc',
              },
            },
            messages: {
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                sender: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            recoveryEvidences: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(
        'Relatório de recuperação não encontrado.',
      );
    }

    return report;
  }
}