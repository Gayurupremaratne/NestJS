import { Module } from '@nestjs/common';
import { EmergencyContactService } from './emergency-contact.service';
import { EmergencyContactController } from './emergency-contact.controller';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentRepository } from '../static-content/static-content.repository';

@Module({
  providers: [
    EmergencyContactService,
    PrismaService,
    UserService,
    UserRepository,
    StaticContentService,
    KeycloakService,
    StaticContentRepository,
  ],
  controllers: [EmergencyContactController],
})
export class EmergencyContactModule {}
