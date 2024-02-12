import { ExistsConstraint } from '@common/validators/ExistsConstraint';
import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { OnboardingMetaController } from '../meta/onboarding-meta-translation.controller';
import { OnboardingGuidelineMetaService } from '../meta/onboarding-meta-translation.service';
import { OnboardingGuidelineController } from './onboarding-guideline.controller';
import { OnboardingGuidelineService } from './onboarding-guideline.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [OnboardingGuidelineController, OnboardingMetaController],
  providers: [
    OnboardingGuidelineService,
    OnboardingGuidelineMetaService,
    PrismaService,
    UniqueConstraint,
    ExistsConstraint,
    AuthGuard,
    UserService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
    PassesService,
  ],
})
export class OnboardingGuidelineModule {}
