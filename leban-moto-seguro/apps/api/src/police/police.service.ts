import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePoliceCheckDto } from './dto/create-police-check.dto';
import { CreatePoliceOfficerDto } from './dto/create-police-officer.dto';

@Injectable()
export class PoliceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createOfficer(dto: CreatePoliceOfficerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const existing = await this.prisma.policeOfficer.findUnique({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('Este usuário já possui perfil de polícia');
    }

    return this.prisma.policeOfficer.create({
      data: {
        userId: dto.userId,
        fullName: dto.fullName,
        identityNumber: dto.identityNumber,
        badgeNumber: dto.badgeNumber,
        stationName: dto.stationName,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async findOfficers() {
    return this.prisma.policeOfficer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async inspectByPlate(plateNumber: string) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { plateNumber },
      include: {
        owner: true,
        driverLinks: {
          where: { isActive: true },
          include: {
            driver: true,
          },
        },
        routes: {
          where: { isActive: true },
        },
        authorizations: {
          where: {
            status: 'APPROVED',
            startDateTime: { lte: new Date() },
            endDateTime: { gte: new Date() },
          },
          include: {
            driver: true,
            route: true,
          },
        },
        theftReports: {
          where: {
            status: {
              in: ['OPEN', 'INVESTIGATING'],
            },
          },
        },
        gpsDevices: {
          where: { isActive: true },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada pela placa');
    }

    return this.buildInspectionResponse(motorcycle);
  }

  async inspectByChassis(chassisNumber: string) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { chassisNumber },
      include: {
        owner: true,
        driverLinks: {
          where: { isActive: true },
          include: {
            driver: true,
          },
        },
        routes: {
          where: { isActive: true },
        },
        authorizations: {
          where: {
            status: 'APPROVED',
            startDateTime: { lte: new Date() },
            endDateTime: { gte: new Date() },
          },
          include: {
            driver: true,
            route: true,
          },
        },
        theftReports: {
          where: {
            status: {
              in: ['OPEN', 'INVESTIGATING'],
            },
          },
        },
        gpsDevices: {
          where: { isActive: true },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada pelo chassi');
    }

    return this.buildInspectionResponse(motorcycle);
  }

  async inspectByEngine(engineNumber: string) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { engineNumber },
      include: {
        owner: true,
        driverLinks: {
          where: { isActive: true },
          include: {
            driver: true,
          },
        },
        routes: {
          where: { isActive: true },
        },
        authorizations: {
          where: {
            status: 'APPROVED',
            startDateTime: { lte: new Date() },
            endDateTime: { gte: new Date() },
          },
          include: {
            driver: true,
            route: true,
          },
        },
        theftReports: {
          where: {
            status: {
              in: ['OPEN', 'INVESTIGATING'],
            },
          },
        },
        gpsDevices: {
          where: { isActive: true },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada pelo número do motor');
    }

    return this.buildInspectionResponse(motorcycle);
  }

  async verifyAuthorizationCode(verificationCode: string) {
    const authorization = await this.prisma.routeAuthorization.findUnique({
      where: { verificationCode },
      include: {
        motorcycle: {
          include: {
            owner: true,
          },
        },
        driver: true,
        route: true,
      },
    });

    if (!authorization) {
      throw new NotFoundException('Código de autorização não encontrado');
    }

    const now = new Date();

    const isValid =
      authorization.status === 'APPROVED' &&
      authorization.startDateTime <= now &&
      authorization.endDateTime >= now;

    return {
      isValid,
      message: isValid
        ? 'Autorização válida'
        : 'Autorização inválida, expirada, cancelada ou não aprovada',
      authorization,
    };
  }

  async createCheck(dto: CreatePoliceCheckDto) {
    const officer = await this.prisma.policeOfficer.findUnique({
      where: { id: dto.policeOfficerId },
    });

    if (!officer) {
      throw new NotFoundException('Polícia não encontrado');
    }

    const check = await this.prisma.policeCheck.create({
      data: {
        policeOfficerId: dto.policeOfficerId,
        motorcycleId: dto.motorcycleId,
        plateNumber: dto.plateNumber,
        chassisNumber: dto.chassisNumber,
        locationText: dto.locationText,
        latitude: dto.latitude,
        longitude: dto.longitude,
        result: dto.result,
        notes: dto.notes,
      },
      include: {
        policeOfficer: true,
        motorcycle: true,
      },
    });

    await this.auditService.create({
      userId: officer.userId,
      action: 'CREATE_POLICE_CHECK',
      entity: 'PoliceCheck',
      entityId: check.id,
      newData: check,
    });

    return check;
  }

  async findChecks() {
    return this.prisma.policeCheck.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        policeOfficer: true,
        motorcycle: true,
      },
    });
  }

  private buildInspectionResponse(motorcycle: any) {
    const hasActiveTheftReport = motorcycle.theftReports.length > 0;
    const activeDrivers = motorcycle.driverLinks.map((link: any) => link.driver);
    const lastGpsLocation =
      motorcycle.gpsDevices?.[0]?.locations?.[0] ?? null;

    let riskLevel = 'NORMAL';
    let message = 'Mota sem alerta crítico ativo';

    if (hasActiveTheftReport) {
      riskLevel = 'CRITICAL';
      message = 'ALERTA: mota com ocorrência aberta de furto/roubo/desaparecimento';
    } else if (motorcycle.status !== 'ACTIVE') {
      riskLevel = 'WARNING';
      message = `Mota com status ${motorcycle.status}`;
    }

    return {
      riskLevel,
      message,
      motorcycle,
      owner: motorcycle.owner,
      activeDrivers,
      activeRoutes: motorcycle.routes,
      activeAuthorizations: motorcycle.authorizations,
      activeTheftReports: motorcycle.theftReports,
      lastGpsLocation,
    };
  }
}