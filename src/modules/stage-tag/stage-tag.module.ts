import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserRepository } from '../user/user.repository';
import { StageTagAssociationController } from './stage-tag-association/stage-tag-association.controller';
import { StageTagAssociationRepository } from './stage-tag-association/stage-tag-association.repository';
import { StageTagAssociationService } from './stage-tag-association/stage-tag-association.service';
import { StageTagTranslationController } from './stage-tag-translation/stage-tag-translation.controller';
import { StageTagTranslationRepository } from './stage-tag-translation/stage-tag-translation.repository';
import { StageTagTranslationService } from './stage-tag-translation/stage-tag-translation.service';
import { StageTagController } from './stage-tag.controller';
import { StageTagRepository } from './stage-tag.repository';
import { StageTagService } from './stage-tag.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [StageTagController, StageTagAssociationController, StageTagTranslationController],
  providers: [
    PrismaService,
    StageTagService,
    StageTagAssociationService,
    StageTagTranslationService,
    StageTagRepository,
    StageTagAssociationRepository,
    StageTagTranslationRepository,
    StaticContentService,
    StaticContentRepository,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
  ],
})
export class StageTagModule {}
