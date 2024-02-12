import { NOTICE_CRON_EXPRESSION } from '@common/constants';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NOTICE_STATUS } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { NoticeRepository } from '../notice.repository';
import { NoticeService } from '../notice.service';

@Injectable()
export class NoticeCronJob {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly noticeService: NoticeService,
  ) {}

  @Cron(NOTICE_CRON_EXPRESSION, { name: 'notice' })
  async cronJobNotice() {
    try {
      Sentry.captureMessage('Notice cron job started at ' + new Date().toISOString(), 'info');
      const notices = await this.noticeRepository.getPendingNotices();
      if (notices.length > 0) {
        const noticeIds = notices.map((notice) => notice.id);
        await this.noticeRepository.updateNoticeStatus(
          NOTICE_STATUS[NOTICE_STATUS.PROCESSING],
          noticeIds,
        );
        await this.noticeService.sendNoticesToQueue(notices);
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }
}
