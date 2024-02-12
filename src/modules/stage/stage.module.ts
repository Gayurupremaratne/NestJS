import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { StageMediaModule } from './stage-media/stage-media.module';
import { StageRegionModule } from './stage-region/stage-region.module';
import { StageReviewModule } from './stage-review/stage-review.module';
import { StageTranslationController } from './stage-translation/stage-translation.controller';
import { StageTranslationRepository } from './stage-translation/stage-translation.repository';
import { StageTranslationService } from './stage-translation/stage-translation.service';
import { StageController } from './stage.controller';
import { StageRepository } from './stage.repository';
import { StageService } from './stage.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  controllers: [StageController, StageTranslationController],
  providers: [
    StageService,
    PrismaService,
    StageRepository,
    StageTranslationService,
    StageTranslationRepository,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
  imports: [StageReviewModule, StageMediaModule, StageRegionModule, MailConsumerModule],
})
export class StageModule {}
