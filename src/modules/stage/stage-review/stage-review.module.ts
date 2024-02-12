import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StageReviewsRepository as ExternalStageReviewsRepository } from '../../stage-review/stage-review.repository';
import { StageReviewService as ExternalStageReviewService } from '../../stage-review/stage-review.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { StageRepository } from '../stage.repository';
import { StageService } from '../stage.service';
import { StageReviewController } from './stage-review.controller';
import { StageReviewsRepository } from './stage-review.repository';
import { StageReviewService } from './stage-review.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [StageReviewController],
  providers: [
    PrismaService,
    StageReviewService,
    StageReviewsRepository,
    StageService,
    StageRepository,
    ExternalStageReviewService,
    ExternalStageReviewsRepository,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class StageReviewModule {}
