import { Module } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PrismaService,
    AuthGuard,
    UserService,
    UserRepository,
    StaticContentService,
    KeycloakService,
    StaticContentRepository,
  ],
})
export class PermissionsModule {}
