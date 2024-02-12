import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { AssetReportsController } from './asset-reports.controller';
import { AssetReportsService } from './asset-reports.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [AssetReportsController],
  providers: [
    AssetReportsService,
    PrismaService,
    AuthGuard,
    UserService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
    PassesService,
  ],
})
export class AssetReportsModule {}
