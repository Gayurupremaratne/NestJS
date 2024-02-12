import { QUEUES, QUEUE_ATTEMPT_BACKOFF, QUEUE_ATTEMPT_COUNT } from '@common/constants';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { NoticeQueueDto } from '../dto/notice-queue.dto';

@Injectable()
export class NoticeQueuePublisher {
  constructor(@InjectQueue(QUEUES.NOTICE) private readonly noticeQueue: Queue) {}

  public async publishToNoticeQueue(noticeQueueData: NoticeQueueDto[]) {
    try {
      const queueData = noticeQueueData.map((notice) => ({
        name: notice.type,
        data: notice,
        opts: {
          removeOnComplete: true,
          attempts: QUEUE_ATTEMPT_COUNT,
          backoff: QUEUE_ATTEMPT_BACKOFF,
        },
      }));
      await this.noticeQueue.addBulk(queueData);
    } catch (error) {
      throw new Error(error);
    }
  }
}
