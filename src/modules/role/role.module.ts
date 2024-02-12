import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [RoleController],
  providers: [
    RoleService,
    PrismaService,
    KeycloakService,
    RoleRepository,
    UniqueConstraint,
    AuthGuard,
    UserService,
    UserRepository,
    PassesService,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class RoleModule {}
