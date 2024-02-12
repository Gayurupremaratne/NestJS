import { Module } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { ForgotPasswordController } from './forgot-password.controller';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { PrismaModule } from '@prisma-orm/prisma.module';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [ForgotPasswordService, MailService, ConfigService],
  controllers: [ForgotPasswordController],
  imports: [KeycloakModule, PrismaModule],
})
export class ForgotPasswordModule {}
