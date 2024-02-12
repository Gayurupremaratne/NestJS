import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { StageMediaController } from './stage-media.controller';
import { StageMediaService } from './stage-media.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [StageMediaController],
  providers: [
    StageMediaService,
    PrismaService,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class StageMediaModule {}
