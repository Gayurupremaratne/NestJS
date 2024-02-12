import { QUEUES } from '@common/constants';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CreatePushNotificationDto } from './dto/notification.dto';
import * as admin from 'firebase-admin';
import { PrismaService } from '@prisma-orm/prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import * as Sentry from '@sentry/node';

@Processor(QUEUES.PUSH_NOTIFICATION)
export class PushNotificationConsumer {
  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async sendPushNotifications({ data }: Job<CreatePushNotificationDto>): Promise<void> {
    const { deviceTokenData, title, body, notificationType, noticeId } = data;

    const records = [];

    const notificationPromises = deviceTokenData.map(async (data) => {
      const message = {
        notification: {
          title,
          body,
        },
        token: data.token,
      };

      try {
        await admin.messaging().send(message);
        records.push({
          title,
          body,
          token: data.token,
          userId: data.userId,
          status: true,
          notificationType,
          isRead: notificationType === $Enums.NOTICE_TYPE.EMAIL,
          noticeId,
        });
      } catch (error) {
        records.push({
          title,
          body,
          token: data.token,
          userId: data.userId,
          status: false,
          notificationType,
          isRead: notificationType === $Enums.NOTICE_TYPE.EMAIL,
          error: `${error.errorInfo.code}-${error.errorInfo.message}`,
          noticeId,
        });
      }
    });

    try {
      await Promise.all(notificationPromises);

      if (records.length > 0) {
        await this.prisma.notifications.createMany({
          data: records,
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'push-notification' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
