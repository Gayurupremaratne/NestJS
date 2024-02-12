import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserTrailTrackingSummaryModule } from './user-trail-tracking-summary/user-trail-tracking-summary.module';
import { UserTrailTrackingController } from './user-trail-tracking.controller';
import { UserTrailTrackingService } from './user-trail-tracking.service';
import { PassesService } from '../passes/passes.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  providers: [
    UserTrailTrackingService,
    PrismaService,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
  controllers: [UserTrailTrackingController],
  imports: [UserTrailTrackingSummaryModule, MailConsumerModule],
})
export class UserTrailTrackingModule {}
