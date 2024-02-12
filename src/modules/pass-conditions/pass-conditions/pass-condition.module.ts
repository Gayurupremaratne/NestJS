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
import { PassConditionMetaController } from '../meta/pass-condition-meta-translation.controller';
import { PassConditionMetaService } from '../meta/pass-condition-meta-translation.service';
import { PassConditionController } from './pass-condition.controller';
import { PassConditionService } from './pass-condition.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [PassConditionController, PassConditionMetaController],
  providers: [
    PassConditionService,
    PassConditionMetaService,
    PrismaService,
    UniqueConstraint,
    ExistsConstraint,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class PassConditionModule {}
