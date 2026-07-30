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
import { UploadsService } from '../uploads/uploads.service';

import { CreateRecoveryEvidenceDto } from './dto/create-recovery-evidence.dto';

type CloudinaryResourceType =
  | 'image'
  | 'video'
  | 'raw';

type UploadedRecoveryFile = {
  file: Express.Multer.File;
  url: string;
  publicId?: string;
  resourceType: CloudinaryResourceType;
};

type UploadServiceResult = {
  url: string;
  publicId?: string;
  resourceType?: CloudinaryResourceType;
};

@Injectable()
export class RecoveryEvidencesService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly realtimeGateway:
      RealtimeGateway,

    private readonly uploadsService:
      UploadsService,
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

    /*
     * Validamos o despacho antes de enviar
     * qualquer arquivo para a Cloudinary.
     */
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

    const uploadedFiles:
      UploadedRecoveryFile[] = [];

    try {
      /*
       * Primeiro enviamos todos os arquivos.
       *
       * Caso um deles falhe, os anteriores
       * serão removidos no bloco catch.
       */
      for (const file of files) {
        const uploadResult =
          (await this.uploadsService.uploadFile(
            file,
            'recovery-evidences',
          )) as UploadServiceResult;

        if (!uploadResult?.url) {
          throw new BadRequestException(
            `Não foi possível enviar o arquivo "${file.originalname}".`,
          );
        }

        uploadedFiles.push({
          file,
          url: uploadResult.url,
          publicId:
            uploadResult.publicId,
          resourceType:
            uploadResult.resourceType ??
            resolveCloudinaryResourceType(
              file.mimetype,
            ),
        });
      }

      /*
       * Todos os registros são criados dentro de
       * uma única transação.
       *
       * Assim, não teremos apenas parte das
       * evidências salva no banco.
       */
      const created =
        await this.prisma.$transaction(
          async (
            transaction,
          ): Promise<
            RecoveryEvidence[]
          > => {
            const evidences:
              RecoveryEvidence[] = [];

            for (
              const uploadedFile
              of uploadedFiles
            ) {
              const evidence =
                await transaction.recoveryEvidence.create(
                  {
                    data: {
                      dispatchId:
                        dto.dispatchId,

                      policeOfficerId:
                        dto.policeOfficerId ??
                        dispatch.policeOfficerId ??
                        undefined,

                      type:
                        resolveEvidenceType(
                          uploadedFile.file
                            .mimetype,
                        ),

                      fileUrl:
                        uploadedFile.url,

                      originalName:
                        uploadedFile.file
                          .originalname,

                      mimeType:
                        uploadedFile.file
                          .mimetype,

                      sizeBytes:
                        uploadedFile.file
                          .size,

                      notes:
                        dto.notes?.trim() ||
                        undefined,

                      latitude,
                      longitude,
                    },
                  },
                );

              evidences.push(evidence);
            }

            return evidences;
          },
        );

      const payload = {
        dispatchId: dto.dispatchId,
        dispatchCode: dispatch.code,
        evidences: created,
        createdAt:
          new Date().toISOString(),
      };

      this.realtimeGateway.emitRecoveryEvidenceCreated(
        payload,
      );

      this.realtimeGateway.emitDashboardUpdated(
        {
          type:
            'recovery-evidence.created',

          dispatchId:
            dto.dispatchId,
        },
      );

      return created;
    } catch (error) {
      /*
       * Se a Cloudinary recebeu arquivos, mas houve
       * falha posterior, apagamos os novos arquivos
       * para evitar arquivos órfãos.
       */
      await this.deleteUploadedFilesSafely(
        uploadedFiles,
      );

      throw error;
    }
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

    /*
     * Primeiro removemos do banco.
     *
     * Somente depois removemos o arquivo da
     * Cloudinary, evitando perder o arquivo
     * se a exclusão do banco falhar.
     */
    await this.prisma.recoveryEvidence.delete({
      where: {
        id,
      },
    });

    await this.deleteFileSafely(
      evidence.fileUrl,
      evidence.mimeType,
    );

    this.realtimeGateway.emitRecoveryEvidenceDeleted(
      {
        id,
        dispatchId:
          evidence.dispatchId,

        deletedAt:
          new Date().toISOString(),
      },
    );

    this.realtimeGateway.emitDashboardUpdated(
      {
        type:
          'recovery-evidence.deleted',

        dispatchId:
          evidence.dispatchId,
      },
    );

    return {
      message:
        'Evidência removida com sucesso.',
    };
  }

  private async deleteUploadedFilesSafely(
    uploadedFiles:
      UploadedRecoveryFile[],
  ): Promise<void> {
    for (const uploadedFile of uploadedFiles) {
      await this.deleteFileSafely(
        uploadedFile.url,
        uploadedFile.file.mimetype,
        uploadedFile.resourceType,
      );
    }
  }

  private async deleteFileSafely(
    url: string,
    mimeType?: string | null,
    knownResourceType?:
      CloudinaryResourceType,
  ): Promise<void> {
    try {
      const publicId =
        this.uploadsService.extractPublicId(
          url,
        );

      /*
       * URLs locais antigas, como:
       *
       * /uploads/recovery-evidences/arquivo.jpg
       *
       * não possuem publicId da Cloudinary e
       * serão ignoradas com segurança.
       */
      if (!publicId) {
        return;
      }

      const resourceType =
        knownResourceType ??
        resolveResourceTypeFromUrlOrMimeType(
          url,
          mimeType,
        );

      await this.uploadsService.deleteFile(
        publicId,
        resourceType,
      );
    } catch (error) {
      /*
       * A falha na limpeza da Cloudinary não
       * deve invalidar uma operação já
       * concluída no banco de dados.
       */
      console.error(
        `Não foi possível excluir a evidência da Cloudinary: ${url}`,
        error,
      );
    }
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
  if (
    mimeType.startsWith('image/')
  ) {
    return RecoveryEvidenceType.PHOTO;
  }

  if (
    mimeType.startsWith('video/')
  ) {
    return RecoveryEvidenceType.VIDEO;
  }

  if (
    mimeType.startsWith('audio/')
  ) {
    return RecoveryEvidenceType.AUDIO;
  }

  return RecoveryEvidenceType.DOCUMENT;
}

function resolveCloudinaryResourceType(
  mimeType: string,
): CloudinaryResourceType {
  if (
    mimeType.startsWith('image/')
  ) {
    return 'image';
  }

  /*
   * Na Cloudinary, arquivos de áudio normalmente
   * usam o resource_type "video".
   */
  if (
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  ) {
    return 'video';
  }

  return 'raw';
}

function resolveResourceTypeFromUrlOrMimeType(
  url: string,
  mimeType?: string | null,
): CloudinaryResourceType {
  if (
    url.includes('/video/upload/')
  ) {
    return 'video';
  }

  if (
    url.includes('/raw/upload/')
  ) {
    return 'raw';
  }

  if (
    url.includes('/image/upload/')
  ) {
    return 'image';
  }

  return resolveCloudinaryResourceType(
    mimeType ??
      'application/octet-stream',
  );
}