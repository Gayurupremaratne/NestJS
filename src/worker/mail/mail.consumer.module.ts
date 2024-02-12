import { AccountRepository } from '../../modules/account/account.repository';
import { OrderRepository } from '../../modules/order/order.repository';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MailConsumer } from './mail.consumer';
import { MailService } from '../../modules/mail/mail.service';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PassesService } from '../../modules/passes/passes.service';
import { PassInventoryService } from '../../modules/pass-inventory/pass-inventory.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'mail',
    }),
  ],
  providers: [
    MailConsumer,
    OrderRepository,
    AccountRepository,
    MailService,
    PrismaService,
    PassesService,
    PassInventoryService,
  ],
  exports: [MailConsumer, BullModule],
})
export class MailConsumerModule {}
