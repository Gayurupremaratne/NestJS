import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { AwardManualBadgeController } from './award-manual-badge.controller';
import { BadgeController } from './badge.controller';
import { BadgeRepository } from './badge.repository';
import { BadgeService } from './badge.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [BadgeController, AwardManualBadgeController],
  providers: [
    BadgeService,
    PrismaService,
    BadgeRepository,
    AuthGuard,
    UserService,
    PassesService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class BadgeModule {}
