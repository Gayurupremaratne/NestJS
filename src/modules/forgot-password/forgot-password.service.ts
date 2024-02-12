import {
  CONFIG_NAMESPACES,
  EMAIL_TEMPLATES,
  FORGOT_PASSWORD_ACTIVE_PERIOD,
  MAIL_FROM,
  RESET_PASSWORD_OTP_ATTEMPTS,
} from '@common/constants';
import { IAppConfig } from '@common/types';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { plainToClass } from 'class-transformer';
import { EmailOtpDto } from '../auth/dto/email-otp.dto';
import { LoginResponseDto } from '../keycloak/dto/keycloak.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { RecoverCodeDto, ResetPasswordDto } from './dto/forgot-password.dto';
import generateOTP from '@common/helpers/otp-generator';
import * as nodemailer from 'nodemailer';
import {
  VerifyCodeRecoveryResponseDto,
  VerifyRecoveryCodeExpirationDto,
} from './dto/verify-recover-response.dto';
import { RoleType } from '@common/constants/role_type.constants';
import * as Sentry from '@sentry/node';
import { millisecondsToHumanReadableTime } from '@common/helpers';

@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private configService: ConfigService,
  ) {}

  /**
   *  Forgot Password
   *  @param email
   */
  async forgotPassword(email: string): Promise<VerifyRecoveryCodeExpirationDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
          where: {
            email: email,
            role_id: { not: RoleType.Banned },
          },
        });

        const codeExpirationPeriod = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)[
          'OTP_EXPIRATION_PERIOD'
        ];

        const expirationData = {
          emailOtpSentAt: new Date(),
          emailOtpExpiresAt: new Date(Date.now() + +codeExpirationPeriod * 1000),
        };

        if (!user) {
          return expirationData;
        }

        // Note: Email OTP Code expiration is set to 60(s)
        if (user.emailOtpSentAt) {
          const otpRequestedTimeIsGreaterThanPeriodThreshold =
            Date.now() - +codeExpirationPeriod * 1000 >= new Date(user.emailOtpSentAt).getTime();

          if (!otpRequestedTimeIsGreaterThanPeriodThreshold) {
            throw new BadRequestException(
              `You have already requested a code. Please wait till the request expires and try again after ${millisecondsToHumanReadableTime(
                user.emailOtpSentAt,
                codeExpirationPeriod,
              )}.`,
            );
          }
        }

        const code = await generateOTP();

        const data: EmailOtpDto = {
          passwordResetUserId: user.id,
          email: user.email,
          code,
          expiresAt: expirationData.emailOtpExpiresAt,
          confirmationAttempts: RESET_PASSWORD_OTP_ATTEMPTS,
        };

        const emailOtp = await tx.emailOtp.create({ data });

        const updatedUser: LoginResponseDto['userData'] = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordResetOtpId: emailOtp.id,
            emailOtpSentAt: expirationData.emailOtpSentAt,
          },
        });

        const mailOptions: nodemailer.SendMailOptions = {
          to: email,
          subject: `${MAIL_FROM} Password reset request`,
        };

        await this.mailService.sendMail(mailOptions, {
          templateName: EMAIL_TEMPLATES.FORGOT_PASSWORD,
          templateVars: {
            code,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
          },
        });

        return expirationData;
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'forgot-password' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Forgot password failed');
    }
  }

  /**
   *  Verify recovery code
   *  @param code
   *  @param email
   */
  async verifyRecoveryCode(
    data: RecoverCodeDto,
    returnWithUser = false,
  ): Promise<VerifyCodeRecoveryResponseDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: {
            passwordResetOtpId: null,
          },
          role_id: { not: RoleType.Banned },
        },
      });

      if (!user) {
        throw new BadRequestException('User not found or invalid');
      }

      const emailOtpRecord = await this.prisma.emailOtp.findFirst({
        where: {
          id: user.passwordResetOtpId,
        },
      });

      if (!emailOtpRecord) {
        throw new BadRequestException('No password reset OTP record found for the user');
      }

      if (emailOtpRecord.confirmationAttempts === 0 && !returnWithUser) {
        throw new BadRequestException('Maximum attempts exceeded');
      }

      const isVerified = emailOtpRecord.code === data.code;

      if (!isVerified) {
        await this.prisma.emailOtp.update({
          where: {
            id: emailOtpRecord.id,
          },
          data: {
            confirmationAttempts: --emailOtpRecord.confirmationAttempts,
          },
        });
        throw new BadRequestException('Entered Code Invalid, please re-enter');
      }

      const isExpired = Date.now() >= new Date(emailOtpRecord.expiresAt).getTime();

      if (isExpired) {
        throw new BadRequestException('Entered Code Expired, please re-enter');
      }

      // Note: Once the OTP is verified OTP code expiration is reset to 5 minutes from now on to complete reset password process

      const expirationData = {
        emailOtpSentAt: new Date(),
        emailOtpExpiresAt: new Date(Date.now() + FORGOT_PASSWORD_ACTIVE_PERIOD * 1000),
      };

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            emailOtpSentAt: expirationData.emailOtpSentAt,
          },
        });

        await tx.emailOtp.update({
          where: { id: user.passwordResetOtpId },
          data: {
            expiresAt: expirationData.emailOtpExpiresAt,
            confirmationAttempts: 0,
          },
        });
      });

      return {
        verified: isVerified && !isExpired,
        expirationData,
        user: returnWithUser ? user : undefined,
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'forgot-password' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Otp creation failed');
    }
  }

  /**
   *  Reset Password
   *  @param code
   *  @param email
   *  @param newPassword
   */
  async resetPassword(data: ResetPasswordDto): Promise<UserDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { verified, user } = await this.verifyRecoveryCode(
          { code: data.code, email: data.email },
          true,
        );

        if (!verified) {
          throw new BadRequestException('Password reset time is expired or invalid');
        }

        await this.keycloakService.resetPassword(user.id, data.newPassword);

        await tx.emailOtp.delete({
          where: {
            id: user.passwordResetOtpId,
          },
        });

        const updatedUser: LoginResponseDto['userData'] = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordResetOtpId: null,
          },
        });

        return plainToClass(UserDto, updatedUser);
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'forgot-password' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Reset Password failed');
    }
  }
}
