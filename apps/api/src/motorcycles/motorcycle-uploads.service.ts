import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

type MotorcycleUploadFiles = {
  photo?: Express.Multer.File[];
  document?: Express.Multer.File[];
};

type UploadedCloudinaryFile = {
  url: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw';
};

@Injectable()
export class MotorcycleUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async uploadFiles(
    motorcycleId: string,
    files: MotorcycleUploadFiles,
  ) {
    const motorcycle =
      await this.prisma.motorcycle.findUnique({
        where: {
          id: motorcycleId,
        },

        include: {
          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!motorcycle) {
      throw new NotFoundException(
        'Mota não encontrada.',
      );
    }

    const photo = files.photo?.[0];
    const document = files.document?.[0];

    if (!photo && !document) {
      throw new BadRequestException(
        'Selecione pelo menos uma foto ou um documento.',
      );
    }

    let uploadedPhoto:
      | UploadedCloudinaryFile
      | undefined;

    let uploadedDocument:
      | UploadedCloudinaryFile
      | undefined;

    try {
      /*
       * A foto principal é enviada como imagem.
       */
      if (photo) {
        uploadedPhoto =
          (await this.uploadsService.uploadFile(
            photo,
            'motorcycles/photos',
          )) as UploadedCloudinaryFile;
      }

      /*
       * Documentos PDF são enviados como raw.
       * Imagens de documentos são enviadas como image.
       */
      if (document) {
        uploadedDocument =
          (await this.uploadsService.uploadFile(
            document,
            'motorcycles/documents',
          )) as UploadedCloudinaryFile;
      }

      const oldPhotoUrl =
        uploadedPhoto &&
        motorcycle.photoUrl &&
        motorcycle.photoUrl !==
          uploadedPhoto.url
          ? motorcycle.photoUrl
          : null;

      const oldDocumentUrls =
        uploadedDocument
          ? motorcycle.documents
              .map((item) =>
                item.fileUrl?.trim(),
              )
              .filter(
                (url): url is string =>
                  Boolean(url) &&
                  url !==
                    uploadedDocument?.url,
              )
          : [];

      const updatedMotorcycle =
        await this.prisma.$transaction(
          async (transaction) => {
            if (uploadedPhoto) {
              await transaction.motorcycle.update({
                where: {
                  id: motorcycleId,
                },

                data: {
                  photoUrl:
                    uploadedPhoto.url,
                },
              });
            }

            if (uploadedDocument) {
              await transaction.motorcycleDocument.deleteMany(
                {
                  where: {
                    motorcycleId,
                  },
                },
              );

              await transaction.motorcycleDocument.create(
                {
                  data: {
                    motorcycleId,

                    type:
                      this.getMotorcycleDocumentType(),

                    fileUrl:
                      uploadedDocument.url,

                    verified: false,
                  },
                },
              );
            }

            return transaction.motorcycle.findUnique(
              {
                where: {
                  id: motorcycleId,
                },

                include: {
                  owner: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          fullName: true,
                          email: true,
                          phone: true,
                          photoUrl: true,
                        },
                      },
                    },
                  },

                  documents: {
                    orderBy: {
                      createdAt: 'desc',
                    },
                  },

                  driverLinks: true,
                  routes: true,
                  gpsDevices: true,
                  theftReports: true,
                },
              },
            );
          },
        );

      /*
       * Arquivos antigos só são apagados depois que
       * a alteração foi confirmada no banco.
       */
      if (oldPhotoUrl) {
        await this.deleteFileSafely(
          oldPhotoUrl,
        );
      }

      await this.deleteFilesSafely(
        oldDocumentUrls,
      );

      return updatedMotorcycle;
    } catch (error) {
      /*
       * Se o upload ocorreu, mas o banco falhou,
       * removemos os novos arquivos para não deixar
       * arquivos órfãos na Cloudinary.
       */
      if (uploadedPhoto?.url) {
        await this.deleteFileSafely(
          uploadedPhoto.url,
        );
      }

      if (uploadedDocument?.url) {
        await this.deleteFileSafely(
          uploadedDocument.url,
        );
      }

      throw error;
    }
  }

  private getMotorcycleDocumentType(): DocumentType {
    const documentTypes =
      DocumentType as unknown as Record<
        string,
        DocumentType
      >;

    const preferredTypes = [
      'MOTORCYCLE_REGISTRATION',
      'MOTORCYCLE_DOCUMENT',
      'REGISTRATION',
      'VEHICLE_REGISTRATION',
      'OWNERSHIP',
      'OTHER',
    ];

    for (const type of preferredTypes) {
      if (documentTypes[type]) {
        return documentTypes[type];
      }
    }

    const firstType =
      Object.values(documentTypes)[0];

    if (!firstType) {
      throw new BadRequestException(
        'Nenhum tipo de documento foi configurado no banco de dados.',
      );
    }

    return firstType;
  }

  private async deleteFilesSafely(
    urls: string[],
  ): Promise<void> {
    for (const url of urls) {
      await this.deleteFileSafely(url);
    }
  }

  private async deleteFileSafely(
    url: string,
  ): Promise<void> {
    try {
      const publicId =
        this.uploadsService.extractPublicId(
          url,
        );

      /*
       * URLs locais antigas ou URLs externas não
       * reconhecidas serão ignoradas.
       */
      if (!publicId) {
        return;
      }

      const resourceType =
        this.getCloudinaryResourceType(url);

      await this.uploadsService.deleteFile(
        publicId,
        resourceType,
      );
    } catch (error) {
      /*
       * Uma falha na limpeza não deve invalidar
       * uma atualização concluída no banco.
       */
      console.error(
        `Não foi possível excluir o arquivo da Cloudinary: ${url}`,
        error,
      );
    }
  }

  private getCloudinaryResourceType(
    url: string,
  ): 'image' | 'video' | 'raw' {
    if (url.includes('/video/upload/')) {
      return 'video';
    }

    if (url.includes('/raw/upload/')) {
      return 'raw';
    }

    return 'image';
  }
}