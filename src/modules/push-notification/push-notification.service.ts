import { NOTICE_STATUS, NOTICE_STATUS_CODE, QUEUES } from '@common/constants';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import { CreatePushNotificationDto } from './dto/notification.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import { NOTICE_CATEGORY, NOTICE_CATEGORY_CODE } from '@common/constants/notice_category.constants';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_CODE,
} from '@common/constants/notification_type.constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { LoggedUserNotificationQueryParams } from './dto/logged-user-notification-query-params.dto';
import { NotificationResponse } from './dto/notification-response.dto';
import { PushNotificationRepository } from './push-notification.repository';
import { UpdateNotificationReadStatusDto } from './dto/update-notification-read-status.dto';
import { Notifications } from '@prisma/client';

@Injectable()
export class PushNotificationService {
  constructor(
    @InjectQueue(QUEUES.PUSH_NOTIFICATION) private readonly notificationQueue: Queue,
    private prisma: PrismaService,
    private pushNotificationRepository: PushNotificationRepository,
  ) {}

  async sendBatchedNotifications(notificationData: CreatePushNotificationDto): Promise<void> {
    await this.notificationQueue.add(notificationData, { removeOnComplete: true });
  }

  async updateNotificationsReadStatus(
    userId: string,
    updateReadStatusData: UpdateNotificationReadStatusDto,
  ): Promise<UpdateNotificationReadStatusDto> {
    const { notificationIds } = updateReadStatusData;

    const notifications =
      await this.pushNotificationRepository.getNotificationsByIds(notificationIds);

    const notificationsBelongToUser = this.validateNotificationOwnership(userId, notifications);

    if (!notificationsBelongToUser) {
      throw new NotFoundException('One or more notifications do not belong to the user.');
    }

    const updateDto: UpdateNotificationReadStatusDto = {
      notificationIds: notificationIds,
    };

    await this.pushNotificationRepository.updateNotificationsReadStatus(userId, updateDto);

    const response: UpdateNotificationReadStatusDto = {
      notificationIds: notificationIds,
    };

    return response;
  }

  private validateNotificationOwnership(userId: string, notifications: Notifications[]): boolean {
    return notifications.every((notification) => notification.userId === userId);
  }

  async getLoggedUserNotifications(
    userId: string,
    params: LoggedUserNotificationQueryParams,
  ): Promise<PaginatedResult<NotificationResponse>> {
    const { category, perPage, pageNumber } = params;
    let categoryFilter;

    const paginate: PaginateFunction = paginator({ perPage });

    if (category === NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.GENERAL]) {
      categoryFilter = null;
    } else if (category === NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.STAGE_WISE]) {
      categoryFilter = {
        not: null,
      };
    }

    return paginate(
      this.prisma.notifications,
      {
        include: {
          notice: {
            select: {
              stage: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        where: {
          userId,
          notificationType: NOTIFICATION_TYPE[NOTIFICATION_TYPE_CODE.NOTIFICATION],
          notice: {
            status: NOTICE_STATUS[NOTICE_STATUS_CODE.SENT],
            category: categoryFilter,
          },
        },
      },
      {
        page: pageNumber,
      },
    );
  }
}
