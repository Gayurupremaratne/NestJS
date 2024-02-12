import { QUEUES } from '@common/constants';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserModule } from '@user/user.module';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { FcmTokensModule } from '../fcm-tokens/fcm-tokens.module';
import { OrderModule } from '../order/order.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { NoticeCronJob } from './cron/notice.cron';
import { NoticeController } from './notice.controller';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';
import { NoticeQueueConsumer } from './queue/notice.consumer';
import { NoticeQueuePublisher } from './queue/notice.publisher';
import { PassesModule } from '../passes/passes.module';

@Module({
  imports: [
    UserModule,
    OrderModule,
    FcmTokensModule,
    BullModule.registerQueue({
      name: QUEUES.NOTICE,
    }),
    MailConsumerModule,
    PushNotificationModule,
    PassesModule,
  ],
  controllers: [NoticeController],
  providers: [
    NoticeService,
    NoticeRepository,
    PrismaService,
    StageService,
    StageRepository,
    NoticeCronJob,
    NoticeQueuePublisher,
    NoticeQueueConsumer,
  ],
})
export class NoticeModule {}
