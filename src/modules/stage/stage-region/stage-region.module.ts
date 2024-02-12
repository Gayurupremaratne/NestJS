import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { StageRegionController } from './stage-region.controller';
import { StageRegionRepository } from './stage-region.repository';
import { StageRegionService } from './stage-region.service';
import { MailConsumerModule } from '../../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [StageRegionController],
  providers: [
    StageRegionService,
    PrismaService,
    StageRegionRepository,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class StageRegionModule {}
