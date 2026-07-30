import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DocumentType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  private readonly userSelect = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    alternativePhone: true,
    photoUrl: true,
    role: true,
    status: true,
  };

  async create(dto: CreateDriverDto) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },

        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          photoUrl: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado',
      );
    }

    const existingDriver =
      await this.prisma.driver.findUnique({
        where: {
          userId: dto.userId,
        },
      });

    if (existingDriver) {
      throw new BadRequestException(
        'Este usuário já possui perfil de motorista',
      );
    }

    const driver =
      await this.prisma.$transaction(
        async (transaction) => {
          const receivedPhotoUrl =
            dto.photoUrl?.trim() || null;

          const createdDriver =
            await transaction.driver.create({
              data: {
                userId: dto.userId,

                /*
                 * Compatibilidade com o model Driver atual.
                 * Estes dados são copiados da conta User.
                 */
                fullName: user.fullName,
                phone: user.phone,
                email: user.email,

                photoUrl:
                  receivedPhotoUrl ||
                  user.photoUrl,

                birthDate:
                  dto.birthDate?.trim()
                    ? new Date(dto.birthDate)
                    : undefined,

                identityNumber:
                  dto.identityNumber?.trim() ||
                  undefined,

                drivingLicenseNumber:
                  dto.drivingLicenseNumber?.trim() ||
                  undefined,

                nationality:
                  dto.nationality?.trim() ||
                  undefined,

                country:
                  dto.country?.trim() ||
                  undefined,

                address:
                  dto.address?.trim() ||
                  undefined,
              },
            });

          /*
           * A foto do motorista também é a foto da
           * conta do usuário.
           */
          if (receivedPhotoUrl) {
            await transaction.user.update({
              where: {
                id: user.id,
              },

              data: {
                photoUrl: receivedPhotoUrl,
              },
            });
          }

          const documents: Prisma.DriverDocumentCreateManyInput[] =
            [];

          if (
            dto.identityDocumentUrl?.trim()
          ) {
            documents.push({
              driverId: createdDriver.id,
              type: DocumentType.IDENTITY,
              fileUrl:
                dto.identityDocumentUrl.trim(),
              verified: true,
            });
          }

          if (
            dto.drivingLicenseDocumentUrl?.trim()
          ) {
            documents.push({
              driverId: createdDriver.id,
              type:
                DocumentType.DRIVING_LICENSE,
              fileUrl:
                dto.drivingLicenseDocumentUrl.trim(),
              verified: true,
            });
          }

          if (documents.length > 0) {
            await transaction.driverDocument.createMany(
              {
                data: documents,
              },
            );
          }

          return createdDriver;
        },
      );

    return this.findById(driver.id);
  }

  async findAll() {
    return this.prisma.driver.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        user: {
          select: this.userSelect,
        },

        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        motorcycleLinks: {
          include: {
            motorcycle: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const driver =
      await this.prisma.driver.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: this.userSelect,
          },

          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },

          motorcycleLinks: {
            include: {
              motorcycle: true,
            },
          },

          authorizations: true,
        },
      });

    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado',
      );
    }

    return driver;
  }

  async update(
    id: string,
    dto: UpdateDriverDto,
  ) {
    await this.findById(id);

    const oldDocumentUrls =
      await this.prisma.$transaction(
        async (transaction) => {
          const filesToDelete: string[] = [];

          const currentDriver =
            await transaction.driver.findUnique({
              where: {
                id,
              },

              select: {
                userId: true,
              },
            });

          if (!currentDriver) {
            throw new NotFoundException(
              'Motorista não encontrado',
            );
          }

          const normalizedPhotoUrl =
            dto.photoUrl !== undefined
              ? dto.photoUrl.trim() || null
              : undefined;

          await transaction.driver.update({
            where: {
              id,
            },

            data: {
              birthDate:
                dto.birthDate !== undefined
                  ? dto.birthDate.trim()
                    ? new Date(dto.birthDate)
                    : null
                  : undefined,

              identityNumber:
                dto.identityNumber !==
                undefined
                  ? dto.identityNumber.trim() ||
                    null
                  : undefined,

              drivingLicenseNumber:
                dto.drivingLicenseNumber !==
                undefined
                  ? dto.drivingLicenseNumber.trim() ||
                    null
                  : undefined,

              nationality:
                dto.nationality !== undefined
                  ? dto.nationality.trim() ||
                    null
                  : undefined,

              country:
                dto.country !== undefined
                  ? dto.country.trim() || null
                  : undefined,

              address:
                dto.address !== undefined
                  ? dto.address.trim() || null
                  : undefined,

              photoUrl: normalizedPhotoUrl,
            },
          });

          /*
           * Mantém a foto do User sincronizada com
           * a foto do perfil Driver.
           */
          if (normalizedPhotoUrl !== undefined) {
            await transaction.user.update({
              where: {
                id: currentDriver.userId,
              },

              data: {
                photoUrl: normalizedPhotoUrl,
              },
            });
          }

          if (
            dto.identityDocumentUrl?.trim()
          ) {
            const oldUrl =
              await this.saveOrReplaceDocument(
                transaction,
                id,
                DocumentType.IDENTITY,
                dto.identityDocumentUrl.trim(),
              );

            if (oldUrl) {
              filesToDelete.push(oldUrl);
            }
          }

          if (
            dto.drivingLicenseDocumentUrl?.trim()
          ) {
            const oldUrl =
              await this.saveOrReplaceDocument(
                transaction,
                id,
                DocumentType.DRIVING_LICENSE,
                dto.drivingLicenseDocumentUrl.trim(),
              );

            if (oldUrl) {
              filesToDelete.push(oldUrl);
            }
          }

          return filesToDelete;
        },
      );

    /*
     * Excluímos da Cloudinary somente depois
     * que a transação do banco foi concluída.
     */
    await this.deleteFilesSafely(
      oldDocumentUrls,
    );

    return this.findById(id);
  }

  private async saveOrReplaceDocument(
    transaction: Prisma.TransactionClient,
    driverId: string,
    type: DocumentType,
    fileUrl: string,
  ): Promise<string | null> {
    const existingDocument =
      await transaction.driverDocument.findFirst({
        where: {
          driverId,
          type,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    if (existingDocument) {
      await transaction.driverDocument.update({
        where: {
          id: existingDocument.id,
        },

        data: {
          fileUrl,
          verified: true,
        },
      });

      /*
       * Evita excluir o arquivo quando a URL
       * recebida for a mesma que já estava salva.
       */
      if (
        existingDocument.fileUrl ===
        fileUrl
      ) {
        return null;
      }

      return existingDocument.fileUrl;
    }

    await transaction.driverDocument.create({
      data: {
        driverId,
        type,
        fileUrl,
        verified: true,
      },
    });

    return null;
  }

  async remove(id: string) {
    const driver =
      await this.findById(id);

    if (
      driver.motorcycleLinks.length > 0
    ) {
      throw new BadRequestException(
        'Não é possível excluir este motorista porque ele está vinculado a uma ou mais motas.',
      );
    }

    if (
      driver.authorizations.length > 0
    ) {
      throw new BadRequestException(
        'Não é possível excluir este motorista porque ele possui autorizações de rota.',
      );
    }

    const documentUrls =
      driver.documents
        .map((document) =>
          document.fileUrl?.trim(),
        )
        .filter(
          (url): url is string =>
            Boolean(url),
        );

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.driverDocument.deleteMany(
          {
            where: {
              driverId: id,
            },
          },
        );

        await transaction.driver.delete({
          where: {
            id,
          },
        });
      },
    );

    /*
     * A foto de perfil não é excluída aqui,
     * pois continua vinculada à conta User.
     */
    await this.deleteFilesSafely(
      documentUrls,
    );

    return {
      message:
        'Motorista excluído com sucesso',
    };
  }

  private async deleteFilesSafely(
    urls: string[],
  ): Promise<void> {
    for (const url of urls) {
      try {
        const publicId =
          this.uploadsService.extractPublicId(
            url,
          );

        /*
         * URLs locais antigas e URLs de outros
         * serviços não serão removidas.
         */
        if (!publicId) {
          continue;
        }

        const resourceType =
          this.getCloudinaryResourceType(
            url,
          );

        await this.uploadsService.deleteFile(
          publicId,
          resourceType,
        );
      } catch (error) {
        /*
         * Uma falha na limpeza da Cloudinary não
         * deve desfazer uma operação já concluída
         * corretamente no banco.
         */
        console.error(
          `Não foi possível excluir o arquivo antigo da Cloudinary: ${url}`,
          error,
        );
      }
    }
  }

  private getCloudinaryResourceType(
    url: string,
  ): 'image' | 'video' | 'raw' {
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

    return 'image';
  }
}