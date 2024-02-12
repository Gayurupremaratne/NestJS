import { Module, UseGuards } from '@nestjs/common';
import { KeycloakConnectModule, RoleGuard, AuthGuard } from 'nest-keycloak-connect';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
//
import { KeycloakConfigService } from '../keycloak/keycloak-config.service';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@prisma-orm/prisma.module';
import { UserService } from '@user/user.service';
import { UserRepository } from '@user/user.repository';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PassesService } from '../passes/passes.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

/**
 * Auth module
 * @description This module is used to handle auth requests
 */
@UseGuards(AuthGuard)
@Module({
  imports: [
    KeycloakModule,
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [KeycloakModule],
    }),
    PrismaModule,
    JwtModule,
    MailConsumerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    UserService,
    UserRepository,
    MailService,
    ConfigService,
    FcmTokensService,
    StaticContentRepository,
    StaticContentService,
    PassesService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
