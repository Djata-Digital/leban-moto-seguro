import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado ao WebSocket: ${client.id}`);

    client.emit('connected', {
      message: 'Conectado ao LEBAN Moto Seguro em tempo real',
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado do WebSocket: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.emit('pong', {
      message: 'pong',
      received: data,
    });
  }

  emitAlertCreated(alert: any) {
    this.server.emit('alert.created', alert);
  }

  emitAlertUpdated(alert: any) {
    this.server.emit('alert.updated', alert);
  }

  emitGpsLocationCreated(location: any) {
    this.server.emit('gps.location.created', location);
  }

  emitPoliceLocationUpdated(location: any) {
    this.server.emit('police.location.updated', location);
  }

  emitPoliceLocationStopped(payload: any) {
    this.server.emit('police.location.stopped', payload);
  }

  emitDashboardUpdated(payload: any) {
    this.server.emit('dashboard.updated', payload);
  }

  emitDispatchMessageCreated(message: any) {
    this.server.emit('dispatch.message.created', message);
  }

  emitDispatchMessagesRead(payload: any) {
    this.server.emit('dispatch.messages.read', payload);
  }

  @SubscribeMessage('dispatch.chat.join')
  joinDispatchRoom(
    @MessageBody() dispatchId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`dispatch-${dispatchId}`);
  }

  @SubscribeMessage('dispatch.chat.leave')
  leaveDispatchRoom(
    @MessageBody() dispatchId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`dispatch-${dispatchId}`);
  }

  emitDispatchTyping(payload: any) {
    this.server
      .to(`dispatch-${payload.dispatchId}`)
      .emit('dispatch.chat.typing', payload);
  }

  emitDispatchStopTyping(payload: any) {
    this.server
      .to(`dispatch-${payload.dispatchId}`)
      .emit('dispatch.chat.stopTyping', payload);
  }

  emitRecoveryEvidenceCreated(payload: any) {
    this.server.emit(
      'recovery-evidence.created',
      payload,
    );
  }

  emitRecoveryEvidenceDeleted(payload: any) {
    this.server.emit(
      'recovery-evidence.deleted',
      payload,
    );
  }

  @SubscribeMessage('dispatch.chat.typing')
  handleDispatchTyping(
    @MessageBody()
    payload: {
      dispatchId: string;
      senderType: 'CENTRAL' | 'POLICE';
    },
    @ConnectedSocket() client: Socket,
  ) {
    client
      .to(`dispatch-${payload.dispatchId}`)
      .emit('dispatch.chat.typing', payload);
  }

  @SubscribeMessage('dispatch.chat.stopTyping')
  handleDispatchStopTyping(
    @MessageBody()
    payload: {
      dispatchId: string;
      senderType: 'CENTRAL' | 'POLICE';
    },
    @ConnectedSocket() client: Socket,
  ) {
    client
      .to(`dispatch-${payload.dispatchId}`)
      .emit('dispatch.chat.stopTyping', payload);
  }
}