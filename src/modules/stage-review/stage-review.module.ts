import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { StageReviewController } from './stage-review.controller';
import { StageReviewsRepository } from './stage-review.repository';
import { StageReviewService } from './stage-review.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [StageReviewController],
  providers: [
    PrismaService,
    StageReviewService,
    StageReviewsRepository,
    StaticContentService,
    StaticContentRepository,
    AuthGuard,
    UserService,
    PassesService,
    UserRepository,
    KeycloakService,
  ],
})
export class StageReviewModule {}
