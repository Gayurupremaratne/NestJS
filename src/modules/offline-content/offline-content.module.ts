import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { OfflineContentController } from './offline-content.controller';
import { OfflineContentService } from './offline-content.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [OfflineContentController],
  providers: [
    OfflineContentService,
    PrismaService,
    UserService,
    PassesService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class OfflineContentModule {}
