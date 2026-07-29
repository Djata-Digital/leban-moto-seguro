import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateDispatchMessageDto } from './dto/create-dispatch-message.dto';

@Injectable()
export class DispatchMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateDispatchMessageDto) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: {
        id: dto.dispatchId,
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado.');
    }

    if (
      dispatch.status === 'RESOLVED' ||
      dispatch.status === 'CANCELLED'
    ) {
      throw new BadRequestException(
        'Não é possível enviar mensagens para um despacho finalizado.',
      );
    }

    if (dto.senderId) {
      const sender = await this.prisma.user.findUnique({
        where: {
          id: dto.senderId,
        },
        select: {
          id: true,
        },
      });

      if (!sender) {
        throw new NotFoundException('Usuário remetente não encontrado.');
      }
    }

    const message = await this.prisma.dispatchMessage.create({
      data: {
        dispatchId: dto.dispatchId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        message: dto.message.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        dispatch: {
          select: {
            id: true,
            code: true,
            status: true,
            policeOfficerId: true,
            motorcycle: {
              select: {
                id: true,
                plateNumber: true,
              },
            },
          },
        },
      },
    });

    this.realtimeGateway.server
      .to(`dispatch-${dto.dispatchId}`)
      .emit('dispatch.message.created', message);

    return message;
  }

  async findByDispatch(dispatchId: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: {
        id: dispatchId,
      },
      select: {
        id: true,
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Despacho não encontrado.');
    }

    return this.prisma.dispatchMessage.findMany({
      where: {
        dispatchId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  async markAsRead(dispatchId: string, senderType: string) {
    const updated = await this.prisma.dispatchMessage.updateMany({
      where: {
        dispatchId,
        senderType: {
          not: senderType as any,
        },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const payload = {
      dispatchId,
      readerType: senderType,
      readAt: new Date().toISOString(),
      updatedCount: updated.count,
    };

    this.realtimeGateway.emitDispatchMessagesRead(payload);

    return payload;
  }

  async countUnread(dispatchId: string, senderType: string) {
    const count = await this.prisma.dispatchMessage.count({
      where: {
        dispatchId,
        senderType: {
          not: senderType as any,
        },
        isRead: false,
      },
    });

    return {
      dispatchId,
      unread: count,
    };
  }
}