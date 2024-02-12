import {
  CONFIG_NAMESPACES,
  EMAIL_TEMPLATES,
  MAIL_FROM,
  NOTICE_QUEUE_BATCH_SIZE,
  NOTICE_TYPE,
  NoticeValidityPeriodEnum,
  QUEUES,
} from '@common/constants';
import { PaginatedResult } from '@common/helpers';
import { IAppConfig } from '@common/types';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { $Enums, NOTICE_STATUS, Notice } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { UserRepository } from '@user/user.repository';
import { Queue } from 'bull';
import moment from 'moment';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { PassesService } from '../passes/passes.service';
import { CreatePushNotificationDto } from '../push-notification/dto/notification.dto';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { StageService } from '../stage/stage.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { CreateMailNotificationLog } from './dto/create-notification-log.dto';
import { GetNoticeDto, GetNoticePaginationDto } from './dto/get-notice.dto';
import { NoticeQueueDto } from './dto/notice-queue.dto';
import { PendingNoticeDto } from './dto/pending-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeRepository } from './notice.repository';
import { NoticeQueuePublisher } from './queue/notice.publisher';

@Injectable()
export class NoticeService {
  constructor(
    private noticeRepository: NoticeRepository,
    private stageService: StageService,
    private userRepository: UserRepository,
    @InjectQueue(QUEUES.MAIL) private readonly sendEmailQueueAccount: Queue,
    private configService: ConfigService,
    private pushNotificationService: PushNotificationService,
    private passesService: PassesService,
    private noticeQueuePublisher: NoticeQueuePublisher,
    private fcmTokenService: FcmTokensService,
  ) {}

  async createNotice(
    userId: string,
    createNoticeData: CreateNoticeDto,
  ): Promise<Notice | Notice[]> {
    let notices: Notice | Notice[];
    if (createNoticeData.category !== null) {
      const retrievedStage = await this.stageService.getStage(createNoticeData.category);

      if (retrievedStage.id === '') {
        throw new Error('Invalid stage Id');
      }
    }
    const enTranslation = createNoticeData.noticeTranslation.find(
      (translation) => translation.localeId === 'en',
    );
    if (!enTranslation.title || !enTranslation.description) {
      throw new Error('English translation must have both title and description');
    }

    const noticeData =
      createNoticeData.isValidityPeriodDefined === NoticeValidityPeriodEnum.YES
        ? createNoticeData
        : this.getNoticeWithValidityPeriod(createNoticeData);

    if (noticeData.type === NOTICE_TYPE[0]) {
      notices = await this.noticeRepository.createEmailNotice(userId, noticeData);
    } else if (noticeData.type === NOTICE_TYPE[1]) {
      notices = await this.noticeRepository.createNotificationNotice(userId, noticeData);
    } else if (noticeData.type === NOTICE_TYPE[2]) {
      notices = await this.createEmailAndNotificationNotices(userId, noticeData);
    }
    return notices;
  }

  getNoticeWithValidityPeriod(notice: CreateNoticeDto): CreateNoticeDto {
    return {
      ...notice,
      startDate: moment().startOf('day').toDate(),
      endDate: moment().add(1, 'years').startOf('day').toDate(),
    };
  }

  private async createEmailAndNotificationNotices(
    userId: string,
    createNoticeData: CreateNoticeDto,
  ): Promise<Notice[]> {
    const emailNotice = await this.noticeRepository.createEmailNotice(userId, createNoticeData);
    const notificationNotice = await this.noticeRepository.createNotificationNotice(
      userId,
      createNoticeData,
    );

    return [emailNotice, notificationNotice];
  }

  async getAll(query: GetNoticePaginationDto): Promise<PaginatedResult<GetNoticeDto>> {
    const data = await this.noticeRepository.getAllNoticesEn(query);
    data.data.forEach((notice) => {
      notice.isEligibleForModifyOrDelete = this.isNoticeEligibleForModifyOrDelete(
        notice.startDate,
        notice.status,
      );
    });
    return data;
  }

  async deleteNotice(id: string): Promise<Notice> {
    const retrievedNotice = await this.noticeRepository.getNotice(id);

    if (
      !this.isNoticeEligibleForModifyOrDelete(retrievedNotice.startDate, retrievedNotice.status)
    ) {
      throw new Error('Cannot delete the notice');
    }
    return await this.noticeRepository.deleteNotice(id);
  }

  async updateNotice(
    id: string,
    userId: string,
    data: UpdateNoticeDto,
  ): Promise<Notice | Notice[]> {
    const retrievedNotice = await this.noticeRepository.getNotice(id);

    if (
      !this.isNoticeEligibleForModifyOrDelete(retrievedNotice.startDate, retrievedNotice.status)
    ) {
      throw new Error('Cannot update the notice');
    }

    const notices: Notice | Notice[] = await this.noticeRepository.updateNotice(id, userId, data);

    return notices;
  }

  async getNoticesByStageId(stageId: string): Promise<Notice[]> {
    return await this.noticeRepository.getNoticesByStageId(stageId);
  }

  isNoticeEligibleForModifyOrDelete(startDate: Date, status: NOTICE_STATUS): boolean {
    return moment(startDate).startOf('day').isAfter(moment()) && status === NOTICE_STATUS.PENDING;
  }

  async sendNoticesToQueue(notices: PendingNoticeDto[]): Promise<PendingNoticeDto[]> {
    try {
      for (const notice of notices) {
        if (notice.category) {
          //STAGE WISE Notices
          await this.sendStageWiseNoticeToQueue(notice);
        } else {
          //GENERAL Notices
          await this.sendGeneralNoticeToQueue(notice);
        }
        this.noticeRepository.updateNoticeStatus(NOTICE_STATUS.SENT, [notice.id]);
      }
      return notices;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error);
    }
  }

  async sendStageWiseNoticeToQueue(notice: PendingNoticeDto): Promise<PendingNoticeDto> {
    let cursor = 0;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      const noticeQueue: NoticeQueueDto[] = [];
      const passes = await this.passesService.getAllPassesUserIdByStage(notice.category, cursor);
      if (passes.length === 0) {
        hasMoreRecords = false; // No more records to fetch
      } else {
        cursor = cursor + NOTICE_QUEUE_BATCH_SIZE; // Update cursor with last record number

        // Process the retrieved batch of records
        for (const pass of passes) {
          noticeQueue.push({ ...notice, userId: pass.userId });
        }
      }
      await this.noticeQueuePublisher.publishToNoticeQueue(noticeQueue);
    }
    return notice;
  }

  async sendGeneralNoticeToQueue(notice: PendingNoticeDto): Promise<PendingNoticeDto> {
    let cursor = 0;
    let hasMoreRecords = true;
    while (hasMoreRecords) {
      const noticeQueue: NoticeQueueDto[] = [];
      const users = await this.userRepository.getAllActiveUserIds(cursor);
      if (users.length === 0) {
        hasMoreRecords = false; // No more records to fetch
      } else {
        cursor = cursor + NOTICE_QUEUE_BATCH_SIZE; // Update cursor with last record number

        // Process the retrieved batch of records
        for (const user of users) {
          noticeQueue.push({ ...notice, userId: user.id });
        }
      }
      await this.noticeQueuePublisher.publishToNoticeQueue(noticeQueue);
    }
    return notice;
  }

  filterTranslationByLocale(notice: PendingNoticeDto, localeId: string) {
    const translation = notice.noticeTranslation.find(
      (translation) => translation.localeId === localeId,
    );
    if (!translation) {
      const englishTranslation = notice.noticeTranslation.find(
        (translation) => translation.localeId === 'en',
      );
      return englishTranslation;
    }
    return translation;
  }

  async getNoticeById(noticeId: string): Promise<Notice> {
    return await this.noticeRepository.getNotice(noticeId);
  }

  async sendNoticeToMailQueue(noticeData: NoticeQueueDto): Promise<NoticeQueueDto> {
    let log: CreateMailNotificationLog;

    const user = await this.userRepository.getUser(noticeData.userId);
    const translation = this.filterTranslationByLocale(noticeData, user.preferredLocaleId);

    const mailOptions = {
      to: user.email,
      subject: `${MAIL_FROM} - Notice`,
    };

    const templateVars = {
      notice_title: translation.title,
      notice_body: translation.description,
      cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
    };

    try {
      await this.sendEmailQueueAccount.add(
        {
          mailOptions,
          templateName: EMAIL_TEMPLATES.NOTICE_EMAIL,
          templateVars,
        },
        { attempts: 20, backoff: 900000 },
      );
      log = {
        title: translation.title,
        body: translation.description,
        isRead: noticeData.type === $Enums.NOTICE_TYPE.EMAIL,
        noticeId: noticeData.id,
        notificationType: noticeData.type,
        status: true,
        userId: noticeData.userId,
      };
    } catch (error) {
      Sentry.captureException(error);
      log = {
        title: translation.title,
        body: translation.description,
        isRead: noticeData.type === $Enums.NOTICE_TYPE.EMAIL,
        noticeId: noticeData.id,
        notificationType: noticeData.type,
        status: false,
        error: error.toString(),
        userId: noticeData.userId,
      };
      throw new Error(error);
    } finally {
      await this.noticeRepository.createNotificationLog(log);
    }
    return noticeData;
  }

  async sendNoticeToNotificationQueue(noticeData: NoticeQueueDto): Promise<NoticeQueueDto> {
    const user = await this.userRepository.getUser(noticeData.userId);
    const fcmTokens = await this.fcmTokenService.getFcmTokensByUserId(noticeData.userId);
    const translation = this.filterTranslationByLocale(noticeData, user.preferredLocaleId);

    if (!fcmTokens || fcmTokens.length === 0) {
      const log = {
        title: translation.title,
        body: translation.description,
        isRead: false,
        noticeId: noticeData.id,
        notificationType: noticeData.type,
        status: false,
        error: 'FCM tokens are not available for user id ' + user.id,
        userId: noticeData.userId,
      };
      await this.noticeRepository.createNotificationLog(log);
      return null;
    }

    const notification: CreatePushNotificationDto = {
      title: translation.title,
      body: translation.description,
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      deviceTokenData: fcmTokens.map((fcmToken) => ({
        token: fcmToken.token,
        userId: fcmToken.userId,
      })),
      isRead: false,
      noticeId: noticeData.id,
    };

    await this.pushNotificationService.sendBatchedNotifications(notification);
    return noticeData;
  }
}
