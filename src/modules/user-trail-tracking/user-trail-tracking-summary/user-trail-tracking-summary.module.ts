import { Module } from '@nestjs/common';
import { UserTrailTrackingSummaryController } from './user-trail-tracking-summary.controller';
import { UserTrailTrackingSummaryService } from './user-trail-tracking-summary.service';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '@user/user.service';
import { UserRepository } from '@user/user.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [UserTrailTrackingSummaryController],
  providers: [
    UserTrailTrackingSummaryService,
    PrismaService,
    UserService,
    UserRepository,
    StaticContentService,
    KeycloakService,
    PassesService,
    StaticContentRepository,
  ],
})
export class UserTrailTrackingSummaryModule {}
