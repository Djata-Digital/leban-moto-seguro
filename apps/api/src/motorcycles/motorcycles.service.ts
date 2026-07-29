import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMotorcycleDto } from './dto/create-motorcycle.dto';
import { UpdateMotorcycleDto } from './dto/update-motorcycle.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MotorcyclesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Gera o próximo código nacional.
   *
   * Exemplo:
   * GB-MOTO-000000001
   */
  private async generateNationalCode() {
    const lastMotorcycle =
      await this.prisma.motorcycle.findFirst({
        where: {
          nationalCode: {
            startsWith: 'GB-MOTO-',
          },
        },

        orderBy: {
          nationalCode: 'desc',
        },

        select: {
          nationalCode: true,
        },
      });

    if (!lastMotorcycle?.nationalCode) {
      return 'GB-MOTO-000000001';
    }

    const numericPart =
      lastMotorcycle.nationalCode.replace(
        'GB-MOTO-',
        '',
      );

    const currentNumber =
      Number.parseInt(numericPart, 10);

    const nextNumber =
      Number.isNaN(currentNumber)
        ? 1
        : currentNumber + 1;

    return `GB-MOTO-${String(
      nextNumber,
    ).padStart(9, '0')}`;
  }

  private cleanRequiredValue(value: string) {
    return value.trim();
  }

  private cleanOptionalValue(
    value?: string,
  ): string | undefined {
    const cleanedValue = value?.trim();

    return cleanedValue || undefined;
  }

  private normalizePlate(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  private normalizeIdentifier(value: string) {
    return value.trim().toUpperCase();
  }

  async create(dto: CreateMotorcycleDto) {
    const owner =
      await this.prisma.owner.findUnique({
        where: {
          id: dto.ownerId,
        },
      });

    if (!owner) {
      throw new NotFoundException(
        'Proprietário não encontrado',
      );
    }

    const chassisNumber =
      this.normalizeIdentifier(
        dto.chassisNumber,
      );

    const plateNumber =
      this.normalizePlate(dto.plateNumber);

    const engineNumber =
      dto.engineNumber?.trim()
        ? this.normalizeIdentifier(
            dto.engineNumber,
          )
        : undefined;

    const existingMotorcycle =
      await this.prisma.motorcycle.findFirst({
        where: {
          OR: [
            {
              chassisNumber,
            },
            {
              plateNumber,
            },
            ...(engineNumber
              ? [
                  {
                    engineNumber,
                  },
                ]
              : []),
          ],
        },
      });

    if (existingMotorcycle) {
      throw new BadRequestException(
        'Já existe uma mota com este chassi, placa ou número de motor.',
      );
    }

    /*
     * São feitas até três tentativas para evitar conflito caso
     * dois cadastros aconteçam quase no mesmo momento.
     */
    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      const nationalCode =
        await this.generateNationalCode();

      try {
        const motorcycle =
          await this.prisma.motorcycle.create({
            data: {
              ownerId: dto.ownerId,
              type: dto.type,

              nationalCode,
              qrToken: randomUUID(),

              brand: this.cleanRequiredValue(dto.brand),

              model: this.cleanOptionalValue(dto.model),

              color: this.cleanOptionalValue(dto.color),

              chassisNumber,
              engineNumber,
              plateNumber,

              photoUrl: this.cleanOptionalValue(dto.photoUrl),
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
                      role: true,
                      status: true,
                    },
                  },
                },
              },

              documents: true,

              driverLinks: {
                where: {
                  isActive: true,
                },

                include: {
                  driver: {
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
                },
              },

              routes: true,
              gpsDevices: true,
              theftReports: true,
            },
          });

        return {
          ...motorcycle,

          message:
            'Mota cadastrada com sucesso. Código nacional e QR Token gerados automaticamente.',
        };
      } catch (error) {
        const isUniqueConstraintError =
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (
          isUniqueConstraintError &&
          attempt < 3
        ) {
          continue;
        }

        if (isUniqueConstraintError) {
          throw new BadRequestException(
            'Já existe uma mota com um dos dados informados.',
          );
        }

        throw error;
      }
    }

    throw new BadRequestException(
      'Não foi possível gerar o código nacional da mota.',
    );
  }

  async findAll() {
    return this.prisma.motorcycle.findMany({
      orderBy: {
        createdAt: 'desc',
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
                role: true,
                status: true,
              },
            },
          },
        },

        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        driverLinks: {
          where: {
            isActive: true,
          },

          include: {
            driver: {
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
          },
        },

        routes: true,
        gpsDevices: true,
        theftReports: true,
      },
    });
  }

  async findById(id: string) {
    const motorcycle =
      await this.prisma.motorcycle.findUnique({
        where: {
          id,
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
                  role: true,
                  status: true,
                },
              },
            },
          },

          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },

          driverLinks: {
            include: {
              driver: {
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
            },

            orderBy: {
              startDate: 'desc',
            },
          },

          routes: true,
          authorizations: true,
          policeChecks: true,
          theftReports: true,

          gpsDevices: {
            include: {
              locations: {
                orderBy: {
                  recordedAt: 'desc',
                },

                take: 1,
              },
            },
          },
        },
      });

    if (!motorcycle) {
      throw new NotFoundException(
        'Mota não encontrada',
      );
    }

    return motorcycle;
  }

  async findByPlate(plateNumber: string) {
    const normalizedPlate =
      this.normalizePlate(plateNumber);

    const motorcycle =
      await this.prisma.motorcycle.findUnique({
        where: {
          plateNumber: normalizedPlate,
        },

        include: {
          owner: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  photoUrl: true,
                },
              },
            },
          },

          documents: true,

          driverLinks: {
            where: {
              isActive: true,
            },

            include: {
              driver: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      phone: true,
                      photoUrl: true,
                    },
                  },
                },
              },
            },
          },

          routes: {
            where: {
              isActive: true,
            },
          },

          theftReports: {
            where: {
              status: {
                in: [
                  'OPEN',
                  'INVESTIGATING',
                ],
              },
            },
          },

          gpsDevices: {
            where: {
              isActive: true,
            },

            include: {
              locations: {
                orderBy: {
                  recordedAt: 'desc',
                },

                take: 1,
              },
            },
          },
        },
      });

    if (!motorcycle) {
      throw new NotFoundException(
        'Mota não encontrada pela placa informada',
      );
    }

    return motorcycle;
  }

  async update(
    id: string,
    dto: UpdateMotorcycleDto,
  ) {
    const currentMotorcycle =
      await this.findById(id);

    if (dto.ownerId) {
      const owner =
        await this.prisma.owner.findUnique({
          where: {
            id: dto.ownerId,
          },
        });

      if (!owner) {
        throw new NotFoundException(
          'Proprietário não encontrado',
        );
      }
    }

    const chassisNumber =
      dto.chassisNumber !== undefined
        ? this.normalizeIdentifier(
            dto.chassisNumber,
          )
        : undefined;

    const plateNumber =
      dto.plateNumber !== undefined
        ? this.normalizePlate(
            dto.plateNumber,
          )
        : undefined;

    const engineNumber =
      dto.engineNumber !== undefined
        ? dto.engineNumber.trim()
          ? this.normalizeIdentifier(
              dto.engineNumber,
            )
          : null
        : undefined;

    if (
      chassisNumber ||
      plateNumber ||
      engineNumber
    ) {
      const duplicates =
        await this.prisma.motorcycle.findFirst({
          where: {
            id: {
              not: id,
            },

            OR: [
              ...(chassisNumber
                ? [
                    {
                      chassisNumber,
                    },
                  ]
                : []),

              ...(plateNumber
                ? [
                    {
                      plateNumber,
                    },
                  ]
                : []),

              ...(engineNumber
                ? [
                    {
                      engineNumber,
                    },
                  ]
                : []),
            ],
          },
        });

      if (duplicates) {
        throw new BadRequestException(
          'Já existe outra mota com este chassi, placa ou número de motor.',
        );
      }
    }

    /*
     * Permite que motos antigas, criadas antes desta atualização,
     * recebam seu código nacional ao serem editadas.
     */
    const nationalCode =
      currentMotorcycle.nationalCode ??
      (await this.generateNationalCode());

    try {
      return await this.prisma.motorcycle.update(
        {
          where: {
            id,
          },

          data: {
            ownerId: dto.ownerId,
            type: dto.type,
            status: dto.status,

            nationalCode,

            brand:
              dto.brand !== undefined
                ? this.cleanRequiredValue(
                    dto.brand,
                  )
                : undefined,

            model:
              dto.model !== undefined
                ? dto.model.trim() || null
                : undefined,

            color:
              dto.color !== undefined
                ? dto.color.trim() || null
                : undefined,

            chassisNumber,
            engineNumber,
            plateNumber,

            photoUrl:
              dto.photoUrl !== undefined
                ? dto.photoUrl.trim() || null
                : undefined,
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

            driverLinks: {
              where: {
                isActive: true,
              },

              include: {
                driver: {
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
              },
            },

            gpsDevices: true,
            theftReports: true,
          },
        },
      );
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe outra mota com um dos dados informados.',
        );
      }

      throw error;
    }
  }

  async verifyByQrToken(
    qrToken: string,
  ) {
    const motorcycle =
      await this.prisma.motorcycle.findUnique({
        where: {
          qrToken,
        },

        include: {
          owner: {
            select: {
              fullName: true,

              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },

          driverLinks: {
            where: {
              isActive: true,
            },

            orderBy: {
              startDate: 'desc',
            },

            take: 1,

            include: {
              driver: {
                select: {
                  fullName: true,

                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },

          theftReports: {
            where: {
              status: {
                in: [
                  'OPEN',
                  'INVESTIGATING',
                ],
              },
            },

            orderBy: {
              createdAt: 'desc',
            },

            take: 1,

            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

    if (!motorcycle) {
      throw new NotFoundException(
        'QR Code inválido ou mota não encontrada.',
      );
    }

    const activeDriver =
      motorcycle.driverLinks[0]?.driver;

    const activeTheftReport =
      motorcycle.theftReports[0];

    const ownerName =
      motorcycle.owner.user?.fullName ||
      motorcycle.owner.fullName;

    const driverName =
      activeDriver?.user?.fullName ||
      activeDriver?.fullName ||
      null;

    return {
      registered: true,

      nationalCode:
        motorcycle.nationalCode,

      plateNumber:
        motorcycle.plateNumber,

      brand: motorcycle.brand,

      model: motorcycle.model,

      color: motorcycle.color,

      type: motorcycle.type,

      status: motorcycle.status,

      chassisLastDigits:
        motorcycle.chassisNumber.slice(-6),

      ownerName,

      currentDriverName: driverName,

      stolen: Boolean(
        activeTheftReport,
      ),

      theftAlert: activeTheftReport
        ? {
            status:
              activeTheftReport.status,

            reportedAt:
              activeTheftReport.createdAt,
          }
        : null,

      updatedAt: motorcycle.updatedAt,
    };
  }

  async remove(id: string) {
    await this.findById(id);

    try {
      await this.prisma.motorcycle.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Não é possível excluir esta mota porque ela possui registros vinculados.',
        );
      }

      throw error;
    }

    return {
      message: 'Mota excluída com sucesso',
    };
  }
}