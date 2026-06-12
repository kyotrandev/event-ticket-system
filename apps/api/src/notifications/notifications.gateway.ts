import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { Notification } from './domain/notification';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // We can restrict this to FRONTEND_DOMAIN later
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or headers
      let token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify token
      const decoded = await this.jwtService.verifyAsync(token);

      // Join user to their specific room
      const userId = decoded.id;
      const userRoom = `user_${userId}`;
      await client.join(userRoom);

      // Also join event specific rooms if provided (for staff/organizer)
      const eventId = client.handshake.query?.eventId as string;
      if (eventId) {
        await client.join(`event_${eventId}`);
      }

      this.logger.log(
        `Client ${client.id} connected and joined room ${userRoom}`,
      );
    } catch (error) {
      this.logger.error(
        `Client ${client.id} connection failed: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Helper method to emit notifications
  emitToUser(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Helper method for event-wide broadcasts (like check-in counts)
  emitToEvent(eventId: string, eventName: string, data: any) {
    this.server.to(`event_${eventId}`).emit(eventName, data);
  }
}
