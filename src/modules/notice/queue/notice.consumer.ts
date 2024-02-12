import { QUEUES } from '@common/constants';
import { Process, Processor } from '@nestjs/bull';
import { NOTICE_TYPE } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { Job } from 'bull';
import { NoticeQueueDto } from '../dto/notice-queue.dto';
import { NoticeService } from '../notice.service';

@Processor(QUEUES.NOTICE)
export class NoticeQueueConsumer {
  constructor(private readonly noticeService: NoticeService) {}

  @Process(NOTICE_TYPE.EMAIL)
  async noticeMailConsumer({ data }: Job<NoticeQueueDto>): Promise<void> {
    try {
      await this.noticeService.sendNoticeToMailQueue(data);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error); //pushes the job to fail queue when error throws
    }
  }

  @Process(NOTICE_TYPE.NOTIFICATION)
  async noticeNotificationConsumer({ data }: Job<NoticeQueueDto>): Promise<void> {
    try {
      await this.noticeService.sendNoticeToNotificationQueue(data);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error); //pushes the job to fail queue when error throws
    }
  }
}
