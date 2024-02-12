import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma-orm/prisma.module';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  providers: [
    AuthGuard,
    UserService,
    PassesService,
    KeycloakService,
    StoryService,
    UserRepository,
    StaticContentService,
    StaticContentRepository,
  ],
  controllers: [StoryController],
  imports: [PrismaModule, MailConsumerModule],
})
export class StoryModule {}
