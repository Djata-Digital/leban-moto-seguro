import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RecoveryEvidenceType,
  type RecoveryEvidence,
} from '@prisma/client';
import type { Express } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateRecoveryEvidenceDto } from './dto/create-recovery-evidence.dto';

@Injectable()
export class RecoveryEvidencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(
    dto: CreateRecoveryEvidenceDto,
    files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'Selecione pelo menos um arquivo.',
      );
    }

    const latitude = parseOptionalNumber(
      dto.latitude,
      'latitude',
      -90,
      90,
    );

    const longitude = parseOptionalNumber(
      dto.longitude,
      'longitude',
      -180,
      180,
    );

    const dispatch =
      await this.prisma.dispatch.findUnique({
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
      throw new NotFoundException(
        'Despacho não encontrado.',
      );
    }

    if (dispatch.status === 'CANCELLED') {
      throw new BadRequestException(
        'Não é possível anexar evidências a um despacho cancelado.',
      );
    }

    if (dto.policeOfficerId) {
      const officer =
        await this.prisma.policeOfficer.findUnique({
          where: {
            id: dto.policeOfficerId,
          },
          select: {
            id: true,
          },
        });

      if (!officer) {
        throw new NotFoundException(
          'Policial não encontrado.',
        );
      }

      if (
        dispatch.policeOfficerId &&
        dispatch.policeOfficerId !==
          dto.policeOfficerId
      ) {
        throw new BadRequestException(
          'Este despacho está designado para outro policial.',
        );
      }
    }

    const created: RecoveryEvidence[] = [];

    for (const file of files) {
      const evidence =
        await this.prisma.recoveryEvidence.create({
          data: {
            dispatchId: dto.dispatchId,

            policeOfficerId:
              dto.policeOfficerId ??
              dispatch.policeOfficerId ??
              undefined,

            type: resolveEvidenceType(
              file.mimetype,
            ),

            fileUrl:
              `/uploads/recovery-evidences/${file.filename}`,

            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,

            notes:
              dto.notes?.trim() ||
              undefined,

            latitude,
            longitude,
          },
        });

      created.push(evidence);
    }

    const payload = {
      dispatchId: dto.dispatchId,
      dispatchCode: dispatch.code,
      evidences: created,
      createdAt: new Date().toISOString(),
    };

    this.realtimeGateway.emitRecoveryEvidenceCreated(
      payload,
    );

    this.realtimeGateway.emitDashboardUpdated({
      type: 'recovery-evidence.created',
      dispatchId: dto.dispatchId,
    });

    return created;
  }

  async findByDispatch(
    dispatchId: string,
  ) {
    const dispatch =
      await this.prisma.dispatch.findUnique({
        where: {
          id: dispatchId,
        },
        select: {
          id: true,
        },
      });

    if (!dispatch) {
      throw new NotFoundException(
        'Despacho não encontrado.',
      );
    }

    return this.prisma.recoveryEvidence.findMany({
      where: {
        dispatchId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        policeOfficer: {
          select: {
            id: true,
            fullName: true,
            badgeNumber: true,
            stationName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const evidence =
      await this.prisma.recoveryEvidence.findUnique({
        where: {
          id,
        },
      });

    if (!evidence) {
      throw new NotFoundException(
        'Evidência não encontrada.',
      );
    }

    await this.prisma.recoveryEvidence.delete({
      where: {
        id,
      },
    });

    this.realtimeGateway.emitRecoveryEvidenceDeleted({
      id,
      dispatchId: evidence.dispatchId,
      deletedAt: new Date().toISOString(),
    });

    return {
      message:
        'Evidência removida com sucesso.',
    };
  }
}

function parseOptionalNumber(
  value: unknown,
  fieldName: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new BadRequestException(
      `${fieldName} inválida.`,
    );
  }

  if (
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new BadRequestException(
      `${fieldName} deve estar entre ${minimum} e ${maximum}.`,
    );
  }

  return parsedValue;
}

function resolveEvidenceType(
  mimeType: string,
): RecoveryEvidenceType {
  if (mimeType.startsWith('image/')) {
    return RecoveryEvidenceType.PHOTO;
  }

  if (mimeType.startsWith('video/')) {
    return RecoveryEvidenceType.VIDEO;
  }

  if (mimeType.startsWith('audio/')) {
    return RecoveryEvidenceType.AUDIO;
  }

  return RecoveryEvidenceType.DOCUMENT;
}