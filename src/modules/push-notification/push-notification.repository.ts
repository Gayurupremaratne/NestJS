import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { UpdateNotificationReadStatusDto } from './dto/update-notification-read-status.dto';
import { Notifications, Prisma } from '@prisma/client';

@Injectable()
export class PushNotificationRepository {
  constructor(private prisma: PrismaService) {}

  async getNotificationsByIds(notificationIds: string[]): Promise<Notifications[]> {
    return this.prisma.notifications.findMany({
      where: {
        id: {
          in: notificationIds,
        },
      },
    });
  }

  async updateNotificationsReadStatus(
    userId: string,
    notificationIds: UpdateNotificationReadStatusDto,
  ): Promise<Prisma.BatchPayload> {
    const { notificationIds: idsToUpdate } = notificationIds;

    const updatedNotifications = await this.prisma.notifications.updateMany({
      where: {
        id: {
          in: idsToUpdate,
        },
        userId: userId,
      },
      data: {
        isRead: true,
      },
    });

    return updatedNotifications;
  }
}
