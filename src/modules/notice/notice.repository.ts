import { NOTICE_STATUS, NOTICE_TYPE } from '@common/constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { parseSortOrder } from '@common/helpers/parse-sort';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Notice, Notifications } from '@prisma/client';
import * as Sentry from '@sentry/node';
import moment from 'moment';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { CreateMailNotificationLog } from './dto/create-notification-log.dto';
import { GetNoticeDto, GetNoticePaginationDto } from './dto/get-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class NoticeRepository {
  constructor(private prisma: PrismaService) {}

  async createEmailNotice(userId: string, createNoticeData: CreateNoticeDto): Promise<Notice> {
    try {
      const emailNotice = await this.prisma.notice.create({
        data: {
          createdBy: userId,
          updatedBy: userId,
          category: createNoticeData.category,
          type: NOTICE_TYPE[0],
          deliveryGroup: createNoticeData.deliveryGroup,
          status: NOTICE_STATUS[0],
          isValidityPeriodDefined: createNoticeData.isValidityPeriodDefined,
          startDate: moment(createNoticeData.startDate).startOf('day').toDate(),
          endDate: moment(createNoticeData.endDate).startOf('day').toDate(),
          noticeTranslation: {
            createMany: {
              data: createNoticeData.noticeTranslation,
            },
          },
        },
      });
      return emailNotice;
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException();
    }
  }

  async createNotificationNotice(
    userId: string,
    createNoticeData: CreateNoticeDto,
  ): Promise<Notice> {
    try {
      const notificationNotice = await this.prisma.notice.create({
        data: {
          createdBy: userId,
          updatedBy: userId,
          category: createNoticeData.category,
          type: NOTICE_TYPE[1],
          deliveryGroup: createNoticeData.deliveryGroup,
          status: NOTICE_STATUS[0],
          isValidityPeriodDefined: createNoticeData.isValidityPeriodDefined,
          startDate: moment(createNoticeData.startDate).startOf('day').toDate(),
          endDate: moment(createNoticeData.endDate).startOf('day').toDate(),
          noticeTranslation: {
            createMany: {
              data: createNoticeData.noticeTranslation,
            },
          },
        },
      });

      return notificationNotice;
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException();
    }
  }

  async getNotice(id: string): Promise<Notice> {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: {
        noticeTranslation: true,
        stage: true,
      },
    });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    return notice;
  }

  async deleteNotice(id: string): Promise<Notice> {
    try {
      const notice = await this.prisma.notice.delete({
        where: { id },
      });
      return notice;
    } catch (error) {
      Sentry.captureException(error);
      throw new NotFoundException('Invalid notice Id or failed to delete notice.');
    }
  }
  async updateNotice(
    id: string,
    userId: string,
    updateNoticeData: UpdateNoticeDto,
  ): Promise<Notice> {
    const notificationNotice = await this.prisma.$transaction(async (prisma) => {
      const updatedNotice = await prisma.notice.update({
        where: { id },
        data: {
          updatedBy: userId,
          category: updateNoticeData.category,
          deliveryGroup: updateNoticeData.deliveryGroup,
          isValidityPeriodDefined: updateNoticeData.isValidityPeriodDefined,
          startDate: updateNoticeData.startDate,
          endDate: updateNoticeData.endDate,
        },
      });

      // Delete existing noticeTranslations
      await prisma.noticeTranslation.deleteMany({
        where: { noticeId: id },
      });

      // Create new noticeTranslations
      const noticeTranslation = updateNoticeData.noticeTranslation.map((translation) => {
        return {
          noticeId: id,
          localeId: translation.localeId,
          title: translation.title,
          description: translation.description,
        };
      });

      await prisma.noticeTranslation.createMany({
        data: noticeTranslation,
      });

      return updatedNotice;
    });

    return notificationNotice;
  }

  async getNoticesByStageId(stageId: string): Promise<Notice[]> {
    try {
      const currentDate = new Date();
      const notices = await this.prisma.notice.findMany({
        where: {
          category: stageId,
          status: 'SENT',
          type: 'NOTIFICATION',
          startDate: {
            lte: currentDate,
          },
          endDate: {
            gte: currentDate,
          },
        },
        take: 5,
        orderBy: {
          startDate: 'desc',
        },
        include: {
          noticeTranslation: true,
        },
      });
      if (!notices) {
        return {} as Notice[];
      }

      return notices;
    } catch (error) {
      Sentry.captureException(error);
      throw new NotFoundException('Invalid stage Id or failed to get notices.');
    }
  }

  async getAllNoticesEn(query: GetNoticePaginationDto): Promise<PaginatedResult<GetNoticeDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: query.perPage,
      });
      return await paginate(
        this.prisma.noticeEn,
        {
          where: {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          orderBy: parseSortOrder(query.sortBy, 'NoticeEn'),
        },
        {
          page: query.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException();
    }
  }

  async getPendingNotices() {
    try {
      const currentDate = moment().toDate();
      const notices = await this.prisma.notice.findMany({
        where: {
          AND: [{ status: NOTICE_STATUS[0] }, { startDate: { lte: currentDate } }],
        },
        select: {
          id: true,
          type: true,
          category: true,
          noticeTranslation: true,
        },
      });
      return notices;
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException();
    }
  }

  async updateNoticeStatus(status: (typeof NOTICE_STATUS)[number], noticeIds: string[]) {
    try {
      return await this.prisma.notice.updateMany({
        data: { status: status },
        where: { id: { in: noticeIds } },
      });
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException();
    }
  }

  async createNotificationLog(data: CreateMailNotificationLog): Promise<Notifications> {
    try {
      return await this.prisma.notifications.create({
        data: {
          title: data.title,
          body: data.body,
          isRead: data.isRead,
          userId: data.userId,
          noticeId: data.noticeId,
          notificationType: data.notificationType,
          status: data.status,
          error: data.error,
        },
      });
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException(error);
    }
  }
}
