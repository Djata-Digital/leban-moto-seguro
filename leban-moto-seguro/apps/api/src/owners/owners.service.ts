import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Injectable()
export class OwnersService {
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

  async create(dto: CreateOwnerDto) {
    const user = await this.prisma.user.findUnique({
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

    const existingOwner =
      await this.prisma.owner.findUnique({
        where: {
          userId: dto.userId,
        },
      });

    if (existingOwner) {
      throw new BadRequestException(
        'Este usuário já possui perfil de proprietário',
      );
    }

    const owner = await this.prisma.$transaction(
      async (transaction) => {
        const createdOwner =
          await transaction.owner.create({
            data: {
              userId: dto.userId,

              /*
               * Estes campos continuam temporariamente porque
               * ainda existem no model Owner atual.
               */
              fullName: user.fullName,
              phone: user.phone,
              email: user.email,
              photoUrl: user.photoUrl,

              birthDate: dto.birthDate
                ? new Date(dto.birthDate)
                : undefined,

              identityNumber:
                dto.identityNumber?.trim() ||
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

        const documents: Array<{
          ownerId: string;
          type: DocumentType;
          fileUrl: string;
          verified: boolean;
        }> = [];

        if (
          dto.identityDocumentUrl?.trim()
        ) {
          documents.push({
            ownerId: createdOwner.id,
            type: DocumentType.IDENTITY,
            fileUrl:
              dto.identityDocumentUrl.trim(),
            verified: true,
          });
        }

        if (
          dto.purchaseDocumentUrl?.trim()
        ) {
          documents.push({
            ownerId: createdOwner.id,
            type:
              DocumentType.PURCHASE_PROOF,
            fileUrl:
              dto.purchaseDocumentUrl.trim(),
            verified: true,
          });
        }

        if (documents.length > 0) {
          await transaction.ownerDocument.createMany(
            {
              data: documents,
            },
          );
        }

        return createdOwner;
      },
    );

    return this.findById(owner.id);
  }

  async findAll() {
    return this.prisma.owner.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        user: {
          select: this.userSelect,
        },

        motorcycles: true,

        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findById(id: string) {
    const owner =
      await this.prisma.owner.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: this.userSelect,
          },

          motorcycles: true,

          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!owner) {
      throw new NotFoundException(
        'Proprietário não encontrado',
      );
    }

    return owner;
  }

  async update(
    id: string,
    dto: UpdateOwnerDto,
  ) {
    await this.findById(id);

    const oldFileUrls =
      await this.prisma.$transaction(
        async (transaction) => {
          const filesToDelete: string[] = [];

          await transaction.owner.update({
            where: {
              id,
            },

            data: {
              birthDate:
                dto.birthDate !== undefined
                  ? dto.birthDate
                    ? new Date(dto.birthDate)
                    : null
                  : undefined,

              identityNumber:
                dto.identityNumber !==
                undefined
                  ? dto.identityNumber.trim() ||
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
            },
          });

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
            dto.purchaseDocumentUrl?.trim()
          ) {
            const oldUrl =
              await this.saveOrReplaceDocument(
                transaction,
                id,
                DocumentType.PURCHASE_PROOF,
                dto.purchaseDocumentUrl.trim(),
              );

            if (oldUrl) {
              filesToDelete.push(oldUrl);
            }
          }

          return filesToDelete;
        },
      );

    /*
     * A exclusão na Cloudinary acontece somente
     * depois que a transação do banco foi concluída.
     *
     * Assim, se o banco falhar, o arquivo antigo
     * não será apagado.
     */
    await this.deleteFilesSafely(
      oldFileUrls,
    );

    return this.findById(id);
  }

  private async saveOrReplaceDocument(
    transaction: any,
    ownerId: string,
    type: DocumentType,
    fileUrl: string,
  ): Promise<string | null> {
    const existingDocument =
      await transaction.ownerDocument.findFirst(
        {
          where: {
            ownerId,
            type,
          },

          orderBy: {
            createdAt: 'desc',
          },
        },
      );

    if (existingDocument) {
      await transaction.ownerDocument.update({
        where: {
          id: existingDocument.id,
        },

        data: {
          fileUrl,
          verified: true,
        },
      });

      /*
       * Se a URL recebida for igual à atual,
       * não devemos excluir o mesmo arquivo.
       */
      if (
        existingDocument.fileUrl ===
        fileUrl
      ) {
        return null;
      }

      return existingDocument.fileUrl;
    }

    await transaction.ownerDocument.create({
      data: {
        ownerId,
        type,
        fileUrl,
        verified: true,
      },
    });

    return null;
  }

  async remove(id: string) {
    const owner = await this.findById(id);

    if (
      owner.motorcycles.length > 0
    ) {
      throw new BadRequestException(
        'Não é possível excluir este proprietário porque ele possui motas cadastradas.',
      );
    }

    const documentUrls =
      owner.documents
        .map((document) =>
          document.fileUrl?.trim(),
        )
        .filter(
          (url): url is string =>
            Boolean(url),
        );

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.ownerDocument.deleteMany(
          {
            where: {
              ownerId: id,
            },
          },
        );

        await transaction.owner.delete({
          where: {
            id,
          },
        });
      },
    );

    await this.deleteFilesSafely(
      documentUrls,
    );

    return {
      message:
        'Proprietário excluído com sucesso',
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
         * URLs locais antigas ou URLs externas
         * não possuem public_id da Cloudinary.
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
         * Uma falha ao limpar o arquivo remoto
         * não deve desfazer uma atualização que
         * já foi salva corretamente no banco.
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
    if (url.includes('/video/upload/')) {
      return 'video';
    }

    if (url.includes('/raw/upload/')) {
      return 'raw';
    }

    return 'image';
  }
}