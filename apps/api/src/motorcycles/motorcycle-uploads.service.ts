import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentType } from '@prisma/client';
import {
  existsSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';

type MotorcycleUploadFiles = {
  photo?: Express.Multer.File[];
  document?: Express.Multer.File[];
};

@Injectable()
export class MotorcycleUploadsService {
  constructor(
    private readonly prisma: PrismaService,
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
          documents: true,
        },
      });

    if (!motorcycle) {
      this.deleteUploadedFiles(files);

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

    const photoUrl = photo
      ? `/uploads/motorcycles/photos/${photo.filename}`
      : undefined;

    const documentUrl = document
      ? `/uploads/motorcycles/documents/${document.filename}`
      : undefined;

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          if (photoUrl) {
            await transaction.motorcycle.update({
              where: {
                id: motorcycleId,
              },

              data: {
                photoUrl,
              },
            });
          }

          if (documentUrl) {
            await transaction.motorcycleDocument.deleteMany({
              where: {
                motorcycleId,
              },
            });

            await transaction.motorcycleDocument.create({
              data: {
                motorcycleId,
                type: this.getMotorcycleDocumentType(),
                fileUrl: documentUrl,
                verified: false,
              },
            });
          }

          return transaction.motorcycle.findUnique({
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

              documents: true,
              driverLinks: true,
              routes: true,
              gpsDevices: true,
              theftReports: true,
            },
          });
        },
      );
    } catch (error) {
      this.deleteUploadedFiles(files);
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

  private deleteUploadedFiles(
    files: MotorcycleUploadFiles,
  ) {
    const allFiles = [
      ...(files.photo ?? []),
      ...(files.document ?? []),
    ];

    for (const file of allFiles) {
      try {
        const filePath = join(
          process.cwd(),
          file.path,
        );

        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch {
        // Evita que um erro de limpeza esconda o erro principal.
      }
    }
  }
}