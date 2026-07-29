import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DispatchEventType,
  DispatchPriority,
  DispatchStatus,
} from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchStatusDto } from './dto/update-dispatch-status.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DispatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateDispatchDto) {
    const code = await this.generateCode();

    const initialStatus = dto.policeOfficerId
      ? DispatchStatus.ASSIGNED
      : DispatchStatus.OPEN;

    const dispatch = await this.prisma.$transaction(async (transaction) => {
      const createdDispatch = await transaction.dispatch.create({
        data: {
          code,
          alertId: dto.alertId,
          motorcycleId: dto.motorcycleId,
          policeOfficerId: dto.policeOfficerId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? DispatchPriority.MEDIUM,
          notes: dto.notes,
          status: initialStatus,
          assignedAt: dto.policeOfficerId ? new Date() : undefined,
        },
      });

      await transaction.dispatchEvent.create({
        data: {
          dispatchId: createdDispatch.id,
          type: DispatchEventType.CREATED,
          status: initialStatus,
          title: 'Despacho criado',
          description:
            dto.description ?? 'Despacho criado pela Central Operacional.',
          metadata: {
            code: createdDispatch.code,
            priority: createdDispatch.priority,
          },
        },
      });

      if (dto.policeOfficerId) {
        await transaction.dispatchEvent.create({
          data: {
            dispatchId: createdDispatch.id,
            type: DispatchEventType.ASSIGNED,
            status: DispatchStatus.ASSIGNED,
            title: 'Policial designado',
            description: dto.notes ?? 'Policial designado no momento da criação.',
            metadata: {
              policeOfficerId: dto.policeOfficerId,
            },
          },
        });
      }

      return createdDispatch;
    });

    const completeDispatch = await this.findById(dispatch.id);

    await this.auditService.create({
      action: 'CREATE_DISPATCH',
      entity: 'Dispatch',
      entityId: dispatch.id,
      newData: completeDispatch,
    });

    if (dto.policeOfficerId) {
      this.emitDispatchAssigned(
        completeDispatch,
      );
    }

    this.realtimeGateway.emitDashboardUpdated({
      type: 'dispatch.created',
      dispatchId: completeDispatch.id,
      dispatch: completeDispatch,
    });

    return completeDispatch;
  }

  async findAll() {
    return this.prisma.dispatch.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: this.defaultInclude(),
    });
  }

  async findById(id: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado');
    }

    return dispatch;
  }

  async findTimeline(id: string) {
    await this.ensureExists(id);

    return this.prisma.dispatchEvent.findMany({
      where: {
        dispatchId: id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findNearestOfficers(id: string) {
    const dispatch = await this.findById(id);

    const motorcycleLocation =
      dispatch.motorcycle?.gpsDevices?.[0]
        ?.locations?.[0];

    const targetLatitude =
      motorcycleLocation?.latitude ??
      dispatch.alert?.latitude;

    const targetLongitude =
      motorcycleLocation?.longitude ??
      dispatch.alert?.longitude;

    if (
      typeof targetLatitude !== 'number' ||
      typeof targetLongitude !== 'number'
    ) {
      throw new NotFoundException(
        'Não existe localização válida da mota ou da ocorrência para calcular os policiais mais próximos.',
      );
    }

    const activeDispatchStatuses: DispatchStatus[] = [
      DispatchStatus.ASSIGNED,
      DispatchStatus.ACCEPTED,
      DispatchStatus.ON_ROUTE,
      DispatchStatus.ARRIVED,
      DispatchStatus.SEARCHING,
      DispatchStatus.IN_PROGRESS,
      DispatchStatus.RECOVERED,
    ];

    const officers =
      await this.prisma.policeOfficer.findMany({
        where: {
          user: {
            status: 'ACTIVE',
          },

          locations: {
            some: {
              isActive: true,
            },
          },

          /*
          * O policial não pode possuir outra missão ativa.
          * O despacho atual é ignorado para permitir recalcular
          * a recomendação depois de uma designação.
          */
          dispatches: {
            none: {
              id: {
                not: id,
              },
              status: {
                in: activeDispatchStatuses,
              },
            },
          },
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
                in: activeDispatchStatuses,
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
            },
          },
        },
      });

    const recommendations = officers
      .map((officer) => {
        const location =
          officer.locations[0];

        if (!location) {
          return null;
        }

        const distanceKm =
          calculateDistanceKm(
            {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            {
              latitude: targetLatitude,
              longitude: targetLongitude,
            },
          );

        const etaMinutes =
          calculateEstimatedMinutes(
            distanceKm,
          );

        return {
          policeOfficerId: officer.id,
          fullName: officer.fullName,
          badgeNumber: officer.badgeNumber,
          stationName: officer.stationName,
          phone: officer.phone,

          operationalStatus:
            officer.dispatches.length > 0
              ? 'DESIGNADO'
              : 'DISPONIVEL',

          distanceKm:
            Number(distanceKm.toFixed(2)),

          distanceMeters:
            Math.round(distanceKm * 1000),

          etaMinutes,

          location: {
            id: location.id,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            recordedAt: location.recordedAt,
          },

          activeDispatch:
            officer.dispatches[0] ?? null,
        };
      })
      .filter(
        (
          recommendation,
        ): recommendation is NonNullable<
          typeof recommendation
        > => recommendation !== null,
      )
      .sort(
        (first, second) =>
          first.distanceKm -
          second.distanceKm,
      );

    return {
      dispatch: {
        id: dispatch.id,
        code: dispatch.code,
        status: dispatch.status,

        motorcycle: dispatch.motorcycle
          ? {
              id: dispatch.motorcycle.id,
              plateNumber:
                dispatch.motorcycle.plateNumber,
            }
          : null,

        targetLocation: {
          latitude: targetLatitude,
          longitude: targetLongitude,

          source: motorcycleLocation
            ? 'MOTORCYCLE_GPS'
            : 'ALERT',
        },
      },

      recommendedOfficer:
        recommendations[0] ?? null,

      officers: recommendations,

      total: recommendations.length,
    };
  }

  async assign(id: string, dto: AssignDispatchDto) {
    const oldDispatch = await this.findById(id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.dispatch.update({
        where: { id },
        data: {
          policeOfficerId: dto.policeOfficerId,
          notes: dto.notes ?? oldDispatch.notes,
          status: DispatchStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await transaction.dispatchEvent.create({
        data: {
          dispatchId: id,
          type: DispatchEventType.ASSIGNED,
          status: DispatchStatus.ASSIGNED,
          title: 'Policial designado',
          description:
            dto.notes ?? 'Um policial foi designado para este despacho.',
          metadata: {
            policeOfficerId: dto.policeOfficerId,
          },
        },
      });
    });

    const updatedDispatch = await this.findById(id);

    await this.auditService.create({
      action: 'ASSIGN_DISPATCH',
      entity: 'Dispatch',
      entityId: id,
      oldData: oldDispatch,
      newData: updatedDispatch,
    });

    this.emitDispatchAssigned(
      updatedDispatch,
    );

    this.realtimeGateway.emitDashboardUpdated({
      type: 'dispatch.assigned',
      dispatchId: updatedDispatch.id,
      dispatch: updatedDispatch,
    });

    return updatedDispatch;
  }

  async accept(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.ACCEPTED,
      eventType: DispatchEventType.ACCEPTED,
      action: 'ACCEPT_DISPATCH',
      title: 'Despacho aceito',
      defaultDescription: 'O policial aceitou o atendimento.',
      dto,
      timestampField: 'acceptedAt',
    });
  }

  async onRoute(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.ON_ROUTE,
      eventType: DispatchEventType.ON_ROUTE,
      action: 'DISPATCH_ON_ROUTE',
      title: 'Equipe em deslocamento',
      defaultDescription: 'A equipe iniciou o deslocamento até a ocorrência.',
      dto,
      timestampField: 'onRouteAt',
    });
  }

  async arrive(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.ARRIVED,
      eventType: DispatchEventType.ARRIVED,
      action: 'ARRIVE_DISPATCH',
      title: 'Equipe chegou ao local',
      defaultDescription: 'A equipe informou que chegou ao local da ocorrência.',
      dto,
      timestampField: 'arrivedAt',
    });
  }

  async startSearch(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.SEARCHING,
      eventType: DispatchEventType.SEARCHING,
      action: 'START_DISPATCH_SEARCH',
      title: 'Busca iniciada',
      defaultDescription: 'A equipe iniciou a busca pela motocicleta.',
      dto,
      timestampField: 'searchingAt',
    });
  }

  async recover(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.RECOVERED,
      eventType: DispatchEventType.RECOVERED,
      action: 'RECOVER_DISPATCH',
      title: 'Motocicleta recuperada',
      defaultDescription: 'A motocicleta foi localizada e recuperada.',
      dto,
      timestampField: 'recoveredAt',
    });
  }

  /**
   * Mantido para compatibilidade com o frontend atual.
   * Posteriormente, o fluxo detalhado deve usar accept, on-route,
   * arrive e search.
   */
  async start(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.IN_PROGRESS,
      eventType: DispatchEventType.NOTE,
      action: 'START_DISPATCH',
      title: 'Atendimento iniciado',
      defaultDescription: 'O atendimento foi iniciado pela Central Operacional.',
      dto,
      timestampField: 'startedAt',
    });
  }

  async resolve(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.RESOLVED,
      eventType: DispatchEventType.RESOLVED,
      action: 'RESOLVE_DISPATCH',
      title: 'Despacho resolvido',
      defaultDescription: 'O despacho foi marcado como resolvido.',
      dto,
      timestampField: 'resolvedAt',
    });
  }

  async cancel(id: string, dto: UpdateDispatchStatusDto) {
    return this.changeStatus({
      id,
      status: DispatchStatus.CANCELLED,
      eventType: DispatchEventType.CANCELLED,
      action: 'CANCEL_DISPATCH',
      title: 'Despacho cancelado',
      defaultDescription: 'O despacho foi cancelado.',
      dto,
      timestampField: 'cancelledAt',
    });
  }

  async addNote(id: string, dto: UpdateDispatchStatusDto) {
    const dispatch = await this.findById(id);

    const event = await this.prisma.dispatchEvent.create({
      data: {
        dispatchId: id,
        type: DispatchEventType.NOTE,
        status: dispatch.status,
        title: 'Observação adicionada',
        description: dto.notes ?? 'Observação operacional.',
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.auditService.create({
      action: 'ADD_DISPATCH_NOTE',
      entity: 'DispatchEvent',
      entityId: event.id,
      newData: event,
    });

    return event;
  }

  private async changeStatus({
    id,
    status,
    eventType,
    action,
    title,
    defaultDescription,
    dto,
    timestampField,
  }: {
    id: string;
    status: DispatchStatus;
    eventType: DispatchEventType;
    action: string;
    title: string;
    defaultDescription: string;
    dto: UpdateDispatchStatusDto;
    timestampField:
      | 'acceptedAt'
      | 'onRouteAt'
      | 'arrivedAt'
      | 'searchingAt'
      | 'startedAt'
      | 'recoveredAt'
      | 'resolvedAt'
      | 'cancelledAt';
  }) {
    const oldDispatch = await this.findById(id);
    const timestamp = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.dispatch.update({
        where: { id },
        data: {
          status,
          notes: dto.notes ?? oldDispatch.notes,
          [timestampField]: timestamp,
        },
      });

      await transaction.dispatchEvent.create({
        data: {
          dispatchId: id,
          type: eventType,
          status,
          title,
          description: dto.notes ?? defaultDescription,
          latitude: dto.latitude,
          longitude: dto.longitude,
          metadata: {
            previousStatus: oldDispatch.status,
            newStatus: status,
          },
        },
      });
    });

    const updatedDispatch = await this.findById(id);

    await this.auditService.create({
      action,
      entity: 'Dispatch',
      entityId: id,
      oldData: oldDispatch,
      newData: updatedDispatch,
    });

    this.realtimeGateway.server.emit(
      'dispatch.updated',
      updatedDispatch,
    );

    this.realtimeGateway.emitDashboardUpdated({
      type: 'dispatch.updated',
      dispatchId: id,
      previousStatus:
        oldDispatch.status,
      currentStatus:
        updatedDispatch.status,
      dispatch: updatedDispatch,
    });

    return updatedDispatch;
  }

  private emitDispatchAssigned(
    dispatch: Awaited<
      ReturnType<
        DispatchesService['findById']
      >
    >,
  ) {
    this.realtimeGateway.server.emit(
      'dispatch.assigned',
      {
        id: dispatch.id,
        code: dispatch.code,
        title: dispatch.title,
        description:
          dispatch.description,
        priority: dispatch.priority,
        status: dispatch.status,
        assignedAt:
          dispatch.assignedAt,

        motorcycle:
          dispatch.motorcycle
            ? {
                id:
                  dispatch.motorcycle.id,

                plateNumber:
                  dispatch.motorcycle
                    .plateNumber,

                brand:
                  dispatch.motorcycle.brand,

                model:
                  dispatch.motorcycle.model,
              }
            : undefined,

        policeOfficer:
          dispatch.policeOfficer
            ? {
                id:
                  dispatch.policeOfficer.id,

                fullName:
                  dispatch.policeOfficer
                    .fullName,

                badgeNumber:
                  dispatch.policeOfficer
                    .badgeNumber,

                stationName:
                  dispatch.policeOfficer
                    .stationName,
              }
            : undefined,
      },
    );
  }

  private async ensureExists(id: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado');
    }
  }

  private async generateCode() {
    const count = await this.prisma.dispatch.count();
    const next = count + 1;

    return `DSP-${String(next).padStart(6, '0')}`;
  }

  private defaultInclude() {
    return {
      alert: true,

      motorcycle: {
        include: {
          owner: true,

          gpsDevices: {
            where: {
              isActive: true,
            },

            include: {
              locations: {
                orderBy: {
                  recordedAt: 'desc' as const,
                },

                take: 1,
              },
            },
          },
        },
      },

      policeOfficer: {
        include: {
          user: true,
        },
      },

      events: {
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
    };
  }
}

type GeographicPosition = {
  latitude: number;
  longitude: number;
};

function calculateDistanceKm(
  pointA: GeographicPosition,
  pointB: GeographicPosition,
) {
  const earthRadiusKm = 6371;

  const toRadians = (
    value: number,
  ) => (value * Math.PI) / 180;

  const deltaLatitude =
    toRadians(
      pointB.latitude -
        pointA.latitude,
    );

  const deltaLongitude =
    toRadians(
      pointB.longitude -
        pointA.longitude,
    );

  const latitudeA =
    toRadians(pointA.latitude);

  const latitudeB =
    toRadians(pointB.latitude);

  const haversine =
    Math.sin(
      deltaLatitude / 2,
    ) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(
        deltaLongitude / 2,
      ) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    );

  return earthRadiusKm * angularDistance;
}

function calculateEstimatedMinutes(
  distanceKm: number,
) {
  if (distanceKm <= 0.03) {
    return 0;
  }

  const estimatedSpeedKmH =
    distanceKm <= 0.5
      ? 12
      : distanceKm <= 2
        ? 25
        : 35;

  return Math.max(
    1,
    Math.ceil(
      (distanceKm /
        estimatedSpeedKmH) *
        60,
    ),
  );
}