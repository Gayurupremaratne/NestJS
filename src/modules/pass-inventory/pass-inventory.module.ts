import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PassInventoryController } from './pass-inventory.controller';
import { PassInventoryService } from './pass-inventory.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [PassInventoryController],
  providers: [
    PassInventoryService,
    PrismaService,
    AuthGuard,
    UserService,
    PassesService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
    MailService,
  ],
})
export class PassInventoryModule {}
