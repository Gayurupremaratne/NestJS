import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { UserQueueModule } from '@user/queue/user-queue.module';

@Module({
  imports: [MailConsumerModule, UserQueueModule],
  controllers: [AccountController],
  providers: [
    UserService,
    PrismaService,
    UserRepository,
    UniqueConstraint,
    StaticContentService,
    StaticContentRepository,
    KeycloakService,
    AccountService,
    AccountRepository,
    MailService,
  ],
})
export class AccountModule {}
