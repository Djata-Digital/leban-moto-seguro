import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IgnitionCommandStatus, IgnitionCommandType, TheftReportStatus, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIgnitionCommandDto, RequestedIgnitionAction } from './dto/create-ignition-command.dto';

@Injectable()
export class IgnitionCommandsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async authorize(userId: string, role: UserRole, motorcycleId: string) {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId },
      include: {
        owner: { select: { userId: true, fullName: true } },
        gpsDevices: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1, include: { locations: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
        theftReports: { where: { status: { in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING] } }, orderBy: { reportedAt: 'desc' }, take: 1 },
      },
    });
    if (!motorcycle) throw new NotFoundException('Mota não encontrada');
    if (role === UserRole.PROPRIETARIO && motorcycle.owner.userId !== userId) throw new ForbiddenException('Você só pode controlar as suas próprias motas');
    return motorcycle;
  }

  async create(userId: string, role: UserRole, motorcycleId: string, dto: CreateIgnitionCommandDto) {
    const motorcycle = await this.authorize(userId, role, motorcycleId);
    const isPolice = role === UserRole.POLICIA || role === UserRole.SUPERVISOR_POLICIA;
    if (isPolice && motorcycle.theftReports.length === 0) throw new BadRequestException('A polícia só pode solicitar bloqueio em mota com ocorrência ativa');
    if (isPolice && !dto.incidentNumber?.trim()) throw new BadRequestException('Informe o número da ocorrência policial');

    const device = motorcycle.gpsDevices[0];
    if (!device) throw new BadRequestException('A mota não possui dispositivo GPS ativo');

    const pending = await this.prisma.ignitionCommand.findFirst({
      where: { motorcycleId, status: { in: [IgnitionCommandStatus.REQUESTED, IgnitionCommandStatus.WAITING_FOR_STOP, IgnitionCommandStatus.WAITING_FOR_DEVICE, IgnitionCommandStatus.SENT] } },
    });
    if (pending) throw new BadRequestException('Já existe um comando de ignição pendente para esta mota');

    const type = dto.action as IgnitionCommandType;
    const last = device.locations[0];
    let status = IgnitionCommandStatus.WAITING_FOR_DEVICE;
    if (type === IgnitionCommandType.SAFE_SHUTDOWN && (last?.speed ?? 0) > 1) status = IgnitionCommandStatus.WAITING_FOR_STOP;

    const command = await this.prisma.ignitionCommand.create({
      data: {
        motorcycleId,
        gpsDeviceId: device.id,
        requestedByUserId: userId,
        type,
        status,
        reason: dto.reason.trim(),
        incidentNumber: dto.incidentNumber?.trim() || null,
        requestedSpeed: last?.speed ?? null,
        requestedLatitude: last?.latitude ?? null,
        requestedLongitude: last?.longitude ?? null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      include: { requestedBy: { select: { id: true, fullName: true, role: true } }, gpsDevice: { select: { id: true, imei: true } } },
    });
    await this.audit.create({ action: `IGNITION_${type}`, entity: 'IgnitionCommand', entityId: command.id, newData: command, userId });
    return { ...command, safetyMessage: status === IgnitionCommandStatus.WAITING_FOR_STOP ? 'A mota está em movimento. O desligamento só será enviado depois de a velocidade permanecer em 0 km/h.' : 'Comando registado e aguardando comunicação do rastreador.' };
  }

  async list(userId: string, role: UserRole, motorcycleId: string) {
    await this.authorize(userId, role, motorcycleId);
    return this.prisma.ignitionCommand.findMany({ where: { motorcycleId }, orderBy: { requestedAt: 'desc' }, take: 20, include: { requestedBy: { select: { fullName: true, role: true } } } });
  }

  async cancel(userId: string, role: UserRole, id: string) {
    const command = await this.prisma.ignitionCommand.findUnique({ where: { id } });
    if (!command) throw new NotFoundException('Comando não encontrado');
    await this.authorize(userId, role, command.motorcycleId);
    if (![IgnitionCommandStatus.REQUESTED, IgnitionCommandStatus.WAITING_FOR_STOP, IgnitionCommandStatus.WAITING_FOR_DEVICE].includes(command.status)) throw new BadRequestException('Este comando já não pode ser cancelado');
    return this.prisma.ignitionCommand.update({ where: { id }, data: { status: IgnitionCommandStatus.CANCELLED, completedAt: new Date() } });
  }
}
