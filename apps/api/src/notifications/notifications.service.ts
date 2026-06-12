import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Notification } from './domain/notification';
import { User } from '../users/domain/user';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const user = new User();
    user.id = createNotificationDto.userId;

    const notification = await this.notificationRepository.create({
      user,
      title: createNotificationDto.title,
      content: createNotificationDto.content,
      type: createNotificationDto.type,
      isRead: false,
      relatedEntityId: createNotificationDto.relatedEntityId,
    });

    // We will emit the notification via Gateway later here
    this.notificationsGateway.emitToUser(user.id as string, notification);

    return notification;
  }

  findByUser(userId: string, paginationOptions: IPaginationOptions) {
    return this.notificationRepository.findByUser(userId, paginationOptions);
  }

  async markAsRead(id: string): Promise<Notification> {
    const updated = await this.notificationRepository.update(id, {
      isRead: true,
    });
    if (!updated) {
      throw new Error('Notification not found');
    }
    return updated;
  }

  emitToEvent(eventId: string, eventName: string, data: any) {
    this.notificationsGateway.emitToEvent(eventId, eventName, data);
  }
}
