import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreatePoliceLocationDto } from './dto/create-police-location.dto';
import { StopPoliceLocationDto } from './dto/stop-police-location.dto';

@Injectable()
export class PoliceLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreatePoliceLocationDto) {
    const policeOfficer = await this.prisma.policeOfficer.findUnique({
      where: {
        id: dto.policeOfficerId,
      },
      select: {
        id: true,
        fullName: true,
        badgeNumber: true,
      },
    });

    if (!policeOfficer) {
      throw new NotFoundException('Policial não encontrado.');
    }

    if (dto.dispatchId) {
      const dispatch = await this.prisma.dispatch.findUnique({
        where: {
          id: dto.dispatchId,
        },
        select: {
          id: true,
          policeOfficerId: true,
          status: true,
        },
      });

      if (!dispatch) {
        throw new NotFoundException('Despacho não encontrado.');
      }

      if (
        dispatch.policeOfficerId &&
        dispatch.policeOfficerId !== dto.policeOfficerId
      ) {
        throw new BadRequestException(
          'Este despacho está designado para outro policial.',
        );
      }

      if (
        dispatch.status === 'RESOLVED' ||
        dispatch.status === 'CANCELLED'
      ) {
        throw new BadRequestException(
          'Não é possível compartilhar localização em um despacho finalizado.',
        );
      }
    }

    const location = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.policeLocation.updateMany({
          where: {
            policeOfficerId: dto.policeOfficerId,
            dispatchId: dto.dispatchId ?? null,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        return transaction.policeLocation.create({
          data: {
            policeOfficerId: dto.policeOfficerId,
            dispatchId: dto.dispatchId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            accuracy: dto.accuracy,
            speed: dto.speed,
            heading: dto.heading,
            recordedAt: dto.recordedAt
              ? new Date(dto.recordedAt)
              : new Date(),
            isActive: true,
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
              select: {
                id: true,
                code: true,
                status: true,
                priority: true,
                motorcycle: {
                  select: {
                    id: true,
                    plateNumber: true,
                    brand: true,
                    model: true,
                  },
                },
              },
            },
          },
        });
      },
    );

    this.realtimeGateway.emitPoliceLocationUpdated(location);

    return location;
  }

  async findActive() {
    return this.prisma.policeLocation.findMany({
      where: {
        isActive: true,
        OR: [
          {
            dispatchId: null,
          },
          {
            dispatch: {
              status: {
                in: [
                  'ASSIGNED',
                  'ACCEPTED',
                  'ON_ROUTE',
                  'ARRIVED',
                  'SEARCHING',
                  'IN_PROGRESS',
                  'RECOVERED',
                ],
              },
            },
          },
        ],
      },
      orderBy: {
        recordedAt: 'desc',
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
          select: {
            id: true,
            code: true,
            status: true,
            priority: true,
            motorcycle: {
              select: {
                id: true,
                plateNumber: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
    });
  }

  async findDispatchHistory(dispatchId: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: {
        id: dispatchId,
      },
      select: {
        id: true,
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado.');
    }

    return this.prisma.policeLocation.findMany({
      where: {
        dispatchId,
      },
      orderBy: {
        recordedAt: 'asc',
      },
      include: {
        policeOfficer: {
          select: {
            id: true,
            fullName: true,
            badgeNumber: true,
          },
        },
      },
    });
  }

  async stop(dto: StopPoliceLocationDto) {
    await this.prisma.policeLocation.updateMany({
      where: {
        policeOfficerId: dto.policeOfficerId,
        dispatchId: dto.dispatchId ?? undefined,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const payload = {
      policeOfficerId: dto.policeOfficerId,
      dispatchId: dto.dispatchId,
      stoppedAt: new Date().toISOString(),
    };

    this.realtimeGateway.emitPoliceLocationStopped(payload);

    return payload;
  }
}