import { ExistsConstraint } from '@common/validators/ExistsConstraint';
import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { FcmTokensController } from './fcm-tokens.controller';
import { FcmTokensService } from './fcm-tokens.service';

@Module({
  imports: [MailConsumerModule],
  controllers: [FcmTokensController],
  providers: [
    FcmTokensService,
    PrismaService,
    ExistsConstraint,
    AuthGuard,
    UserService,
    KeycloakService,
    UserRepository,
    StaticContentService,
    StaticContentRepository,
    PassesService,
  ],
  exports: [FcmTokensService],
})
export class FcmTokensModule {}
