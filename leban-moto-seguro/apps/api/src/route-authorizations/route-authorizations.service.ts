import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteAuthorizationDto } from './dto/create-route-authorization.dto';
import { DecideRouteAuthorizationDto } from './dto/decide-route-authorization.dto';

@Injectable()
export class RouteAuthorizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateVerificationCode() {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `AUTH-${Date.now()}-${random}`;
  }

  async create(dto: CreateRouteAuthorizationDto) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });

    if (!motorcycle) {
      throw new NotFoundException('Mota não encontrada');
    }

    if (motorcycle.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível solicitar autorização para mota que não está ativa',
      );
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    const activeLink = await this.prisma.driverMotorcycleLink.findFirst({
      where: {
        motorcycleId: dto.motorcycleId,
        driverId: dto.driverId,
        isActive: true,
      },
    });

    if (!activeLink) {
      throw new BadRequestException(
        'Motorista não está autorizado a conduzir esta mota',
      );
    }

    if (dto.routeId) {
      const route = await this.prisma.motorcycleRoute.findUnique({
        where: { id: dto.routeId },
      });

      if (!route) {
        throw new NotFoundException('Rota não encontrada');
      }

      if (route.motorcycleId !== dto.motorcycleId) {
        throw new BadRequestException('Esta rota não pertence à mota informada');
      }
    }

    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);

    if (end <= start) {
      throw new BadRequestException(
        'Data/hora final deve ser maior que data/hora inicial',
      );
    }

    const verificationCode = this.generateVerificationCode();

    return this.prisma.routeAuthorization.create({
      data: {
        motorcycleId: dto.motorcycleId,
        driverId: dto.driverId,
        routeId: dto.routeId,
        requestedDestination: dto.requestedDestination,
        reason: dto.reason,
        startDateTime: start,
        endDateTime: end,
        status: 'PENDING',
        verificationCode,
        qrCodeData: verificationCode,
      },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async findAll() {
    return this.prisma.routeAuthorization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async findById(id: string) {
    const authorization = await this.prisma.routeAuthorization.findUnique({
      where: { id },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });

    if (!authorization) {
      throw new NotFoundException('Autorização não encontrada');
    }

    return authorization;
  }

  async findByMotorcycle(motorcycleId: string) {
    return this.prisma.routeAuthorization.findMany({
      where: { motorcycleId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async findByDriver(driverId: string) {
    return this.prisma.routeAuthorization.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async findActiveByMotorcycle(motorcycleId: string) {
    const now = new Date();

    return this.prisma.routeAuthorization.findMany({
      where: {
        motorcycleId,
        status: 'APPROVED',
        startDateTime: { lte: now },
        endDateTime: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async approve(id: string, dto: DecideRouteAuthorizationDto) {
    const authorization = await this.findById(id);

    if (authorization.status !== 'PENDING') {
      throw new BadRequestException(
        'Somente autorização pendente pode ser aprovada',
      );
    }

    return this.prisma.routeAuthorization.update({
      where: { id },
      data: {
        status: 'APPROVED',
        ownerDecisionNote: dto.decisionNote,
      },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async reject(id: string, dto: DecideRouteAuthorizationDto) {
    const authorization = await this.findById(id);

    if (authorization.status !== 'PENDING') {
      throw new BadRequestException(
        'Somente autorização pendente pode ser recusada',
      );
    }

    return this.prisma.routeAuthorization.update({
      where: { id },
      data: {
        status: 'REJECTED',
        ownerDecisionNote: dto.decisionNote,
      },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async cancel(id: string, dto: DecideRouteAuthorizationDto) {
    await this.findById(id);

    return this.prisma.routeAuthorization.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        ownerDecisionNote: dto.decisionNote,
      },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });
  }

  async verifyByCode(verificationCode: string) {
    const authorization = await this.prisma.routeAuthorization.findUnique({
      where: { verificationCode },
      include: {
        motorcycle: true,
        driver: true,
        route: true,
      },
    });

    if (!authorization) {
      throw new NotFoundException('Código de autorização inválido');
    }

    const now = new Date();

    const isValid =
      authorization.status === 'APPROVED' &&
      authorization.startDateTime <= now &&
      authorization.endDateTime >= now;

    return {
      isValid,
      authorization,
      message: isValid
        ? 'Autorização válida'
        : 'Autorização inválida, expirada ou não aprovada',
    };
  }
}