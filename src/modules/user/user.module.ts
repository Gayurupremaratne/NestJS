import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserQueueModule } from './queue/user-queue.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [UserQueueModule, MailConsumerModule],
  controllers: [UserController],
  providers: [
    AuthGuard,
    UserService,
    PrismaService,
    UserRepository,
    UniqueConstraint,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
    PassesService,
    StageService,
    StageRepository,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
