import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [MailConsumerModule],
  controllers: [OrderController],
  providers: [
    PrismaService,
    OrderService,
    OrderRepository,
    PassesService,
    PassInventoryService,
    MailService,
    AuthGuard,
    UserService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
