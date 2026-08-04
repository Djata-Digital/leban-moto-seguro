import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoliceAccessType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePoliceOfficerDto } from './dto/create-police-officer.dto';
import { UpdatePoliceOfficerDto } from './dto/update-police-officer.dto';
import { UpdatePoliceStatusDto } from './dto/update-police-status.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreatePoliceLocationDto } from './dto/create-police-location.dto';

@Injectable()
export class PoliceOfficersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreatePoliceOfficerDto) {
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    if (!email && !phone) {
      throw new BadRequestException(
        'Informe pelo menos o e-mail ou o telefone do policial',
      );
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException('Este telefone já está cadastrado');
      }
    }

    if (dto.badgeNumber) {
      const existingBadge = await this.prisma.policeOfficer.findFirst({
        where: {
          badgeNumber: dto.badgeNumber.trim(),
        },
      });

      if (existingBadge) {
        throw new ConflictException('Esta matrícula policial já está cadastrada');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          phone,
          passwordHash,

          /*
           * Caso o seu enum UserRole use outro nome, por exemplo
           * POLICE_OFFICER, troque somente "POLICE" abaixo.
           */
          role: UserRole.POLICIA,
          policeAccessType: PoliceAccessType.OPERATIONS,
          status: 'ACTIVE',
        },
      });

      return transaction.policeOfficer.create({
        data: {
          userId: user.id,
          fullName: dto.fullName.trim(),
          identityNumber: dto.identityNumber?.trim(),
          badgeNumber: dto.badgeNumber?.trim(),
          stationName: dto.stationName?.trim(),
          phone,
          photoUrl: dto.photoUrl?.trim(),
        },
        include: this.defaultInclude(),
      });
    });
  }

  async findAll() {
    return this.prisma.policeOfficer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: this.defaultInclude(),
    });
  }

  async findById(id: string) {
    const officer = await this.prisma.policeOfficer.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!officer) {
      throw new NotFoundException('Policial não encontrado');
    }

    return officer;
  }

  async update(id: string, dto: UpdatePoliceOfficerDto) {
    const officer = await this.findById(id);

    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    if (email && email !== officer.user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
    }

    if (phone && phone !== officer.user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException('Este telefone já está cadastrado');
      }
    }

    if (dto.badgeNumber && dto.badgeNumber !== officer.badgeNumber) {
      const existingBadge = await this.prisma.policeOfficer.findFirst({
        where: {
          badgeNumber: dto.badgeNumber.trim(),
          id: {
            not: id,
          },
        },
      });

      if (existingBadge) {
        throw new ConflictException('Esta matrícula policial já está cadastrada');
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: officer.userId,
        },
        data: {
          fullName: dto.fullName?.trim(),
          email,
          phone,
        },
      });

      return transaction.policeOfficer.update({
        where: { id },
        data: {
          fullName: dto.fullName?.trim(),
          identityNumber: dto.identityNumber?.trim(),
          badgeNumber: dto.badgeNumber?.trim(),
          stationName: dto.stationName?.trim(),
          phone,
          photoUrl: dto.photoUrl?.trim(),
        },
        include: this.defaultInclude(),
      });
    });
  }

  async updateStatus(id: string, dto: UpdatePoliceStatusDto) {
    const officer = await this.findById(id);

    await this.prisma.user.update({
      where: {
        id: officer.userId,
      },
      data: {
        status: dto.status,
      },
    });

    return this.findById(id);
  }

  async findDispatches(id: string) {
    await this.findById(id);

    return this.prisma.dispatch.findMany({
      where: {
        policeOfficerId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        alert: true,
        motorcycle: {
          include: {
            owner: true,
          },
        },
      },
    });
  }

  async createLocation(
    policeOfficerId: string,
    dto: CreatePoliceLocationDto,
  ) {
    const officer = await this.findById(
      policeOfficerId,
    );

    if (dto.dispatchId) {
      const dispatch =
        await this.prisma.dispatch.findUnique({
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
        throw new NotFoundException(
          'Despacho não encontrado',
        );
      }

      if (
        dispatch.policeOfficerId &&
        dispatch.policeOfficerId !==
          policeOfficerId
      ) {
        throw new BadRequestException(
          'Este despacho está designado para outro policial',
        );
      }
    }

    /*
    * Marcamos como inativas as posições anteriores
    * do mesmo policial. O histórico continua salvo.
    */
    await this.prisma.policeLocation.updateMany({
      where: {
        policeOfficerId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const location =
      await this.prisma.policeLocation.create({
        data: {
          policeOfficerId,
          dispatchId: dto.dispatchId,
          latitude: Number(dto.latitude),
          longitude: Number(dto.longitude),
          accuracy:
            dto.accuracy !== undefined
              ? Number(dto.accuracy)
              : undefined,
          speed:
            dto.speed !== undefined
              ? Number(dto.speed)
              : undefined,
          heading:
            dto.heading !== undefined
              ? Number(dto.heading)
              : undefined,
          isActive: dto.isActive ?? true,
          recordedAt: new Date(),
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
              motorcycleId: true,
            },
          },
        },
      });

    const payload = {
      id: location.id,
      policeOfficerId,
      dispatchId: location.dispatchId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      isActive: location.isActive,
      recordedAt: location.recordedAt,
      policeOfficer: location.policeOfficer,
      dispatch: location.dispatch,
    };

    this.realtimeGateway.server.emit(
      'police.location.updated',
      payload,
    );

    this.realtimeGateway.emitDashboardUpdated({
      type: 'police.location.updated',
      policeOfficerId,
      dispatchId: location.dispatchId,
      location: payload,
    });

    return payload;
  }

  async findLiveLocations() {
    const officers =
      await this.prisma.policeOfficer.findMany({
        orderBy: {
          fullName: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              status: true,
            },
          },
          locations: {
            where: {
              isActive: true,
            },
            orderBy: {
              recordedAt: 'desc',
            },
            take: 1,
          },
          dispatches: {
            where: {
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
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              code: true,
              status: true,
              motorcycleId: true,
              motorcycle: {
                select: {
                  id: true,
                  plateNumber: true,
                },
              },
            },
          },
        },
      });

    return officers.map((officer) => {
      const lastLocation =
        officer.locations[0] ?? null;

      const activeDispatch =
        officer.dispatches[0] ?? null;

      return {
        id: officer.id,
        fullName: officer.fullName,
        badgeNumber: officer.badgeNumber,
        stationName: officer.stationName,
        phone: officer.phone,
        userStatus: officer.user.status,
        operationalStatus:
          resolvePoliceOperationalStatus(
            activeDispatch?.status,
            lastLocation?.recordedAt,
          ),
        activeDispatch,
        location: lastLocation,
      };
    });
  }

  async findLocationHistory(
    policeOfficerId: string,
    dispatchId?: string,
  ) {
    await this.findById(policeOfficerId);

    return this.prisma.policeLocation.findMany({
      where: {
        policeOfficerId,
        dispatchId:
          dispatchId || undefined,
      },
      orderBy: {
        recordedAt: 'asc',
      },
      take: 2000,
    });
  }

  async stopLocationSharing(
    policeOfficerId: string,
  ) {
    await this.findById(policeOfficerId);

    await this.prisma.policeLocation.updateMany({
      where: {
        policeOfficerId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const payload = {
      policeOfficerId,
      isActive: false,
      stoppedAt: new Date().toISOString(),
    };

    this.realtimeGateway.server.emit(
      'police.location.stopped',
      payload,
    );

    return {
      success: true,
      message:
        'Compartilhamento de localização encerrado',
    };
  }

  async remove(id: string) {
    const officer = await this.findById(id);

    const activeDispatches = await this.prisma.dispatch.count({
      where: {
        policeOfficerId: id,
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeDispatches > 0) {
      throw new BadRequestException(
        'Não é possível excluir um policial com despachos ativos',
      );
    }

    /*
     * Excluímos somente o perfil policial.
     * O usuário permanece no sistema para preservar auditoria e histórico.
     */
    await this.prisma.policeOfficer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Perfil policial removido com sucesso',
      userId: officer.userId,
    };
  }

  private defaultInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          checks: true,
          dispatches: true,
        },
      },
    };
  }
}

function resolvePoliceOperationalStatus(
  dispatchStatus?: string,
  recordedAt?: Date,
) {
  if (!recordedAt) {
    return 'SEM_LOCALIZACAO';
  }

  const ageMilliseconds =
    Date.now() -
    new Date(recordedAt).getTime();

  if (ageMilliseconds > 5 * 60 * 1000) {
    return 'OFFLINE';
  }

  if (
    dispatchStatus === 'ON_ROUTE' ||
    dispatchStatus === 'ACCEPTED'
  ) {
    return 'EM_DESLOCAMENTO';
  }

  if (
    dispatchStatus === 'ARRIVED' ||
    dispatchStatus === 'SEARCHING' ||
    dispatchStatus === 'IN_PROGRESS' ||
    dispatchStatus === 'RECOVERED'
  ) {
    return 'EM_ATENDIMENTO';
  }

  if (dispatchStatus === 'ASSIGNED') {
    return 'DESIGNADO';
  }

  return 'DISPONIVEL';
}