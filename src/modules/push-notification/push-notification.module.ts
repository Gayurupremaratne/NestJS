import { QUEUES } from '@common/constants';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PushNotificationConsumer } from './push-notification.consumer';
import { PushNotificationController } from './push-notification.controller';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationRepository } from './push-notification.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.PUSH_NOTIFICATION,
    }),
    MailConsumerModule,
  ],
  providers: [
    PushNotificationService,
    PrismaService,
    PushNotificationConsumer,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
    PushNotificationRepository,
  ],
  controllers: [PushNotificationController],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
