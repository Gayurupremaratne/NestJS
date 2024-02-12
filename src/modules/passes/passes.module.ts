import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PassesController } from './passes.controller';
import { PassesService } from './passes.service';

@Module({
  imports: [MailConsumerModule],
  controllers: [PassesController],
  providers: [
    PassesService,
    PrismaService,
    StageService,
    StageRepository,
    AuthGuard,
    UserService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
  exports: [PassesService],
})
export class PassesModule {}
