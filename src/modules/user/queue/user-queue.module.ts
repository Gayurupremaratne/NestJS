import { QUEUES } from '@common/constants';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { OrderModule } from '../../order/order.module';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { UserQueueConsumer } from './user-queue.consumer';
import { UserQueuePublisher } from './user-queue.publisher';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.USER_DELETE,
    }),
    OrderModule,
    MailConsumerModule,
  ],
  providers: [
    UserQueueConsumer,
    UserQueuePublisher,
    KeycloakService,
    UserRepository,
    PrismaService,
    PassesService,
    PassInventoryService,
    MailService,
  ],
  exports: [UserQueuePublisher],
})
export class UserQueueModule {}
