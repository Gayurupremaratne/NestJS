import {
  CONFIG_NAMESPACES,
  EMAIL_CONFIRMATION_OTP_ATTEMPTS,
  EMAIL_TEMPLATES,
  MAIL_FROM,
  REGISTRATION_STATUS,
  STATUS_CODE,
} from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import generateOTP from '@common/helpers/otp-generator';
import generateRandomString from '@common/helpers/random-password-generator';
import { IAppConfig } from '@common/types';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/node';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { plainToClass } from 'class-transformer';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { KeycloakCreateUserDto } from '../keycloak/dto/keycloak-create-user.dto';
import { KeycloakUserDto } from '../keycloak/dto/keycloak-user.dto';
import { KeycloakTokensDto, LoginResponseDto } from '../keycloak/dto/keycloak.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { UserDto, UserDtoWithOtpExpiration } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';
import { AuthSocialLogin } from './dto/auth-social-login.dto';
import { AuthUserDto } from './dto/auth-user';
import {
  AuthenticatedUserDecodedTokenDto,
  IdentityProvider,
} from './dto/authenticated-user-decoded-token.dto';
import { CreateAccountAdminDto } from './dto/create-account-admin.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { EmailOtpDto } from './dto/email-otp.dto';
import { EmergencyContactDto, EmergencyContactExtendedDto } from './dto/emergency-contact.dto';
import { RefreshTokenRequest } from './dto/refresh-token';
import { millisecondsToHumanReadableTime } from '@common/helpers';

/**
 * Auth service
 * @description This service is used to handle auth requests
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private userService: UserService,
    private readonly mailService: MailService,
    private configService: ConfigService,
  ) {}

  /**
   * Get user info
   * @param email
   * @returns user info
   */
  async getUserInfo(email: string) {
    try {
      const userEmail = email;
      const userInfo = await this.keycloakService.getUser(userEmail);
      return userInfo;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Social login
   * @param code
   * @param codeVerifier
   * @returns Tokens
   */
  async socialLogin(reqBody: AuthSocialLogin) {
    try {
      const { code, codeVerifier } = reqBody;
      // Exchange code and obtain tokens
      const keycloakTokens: KeycloakTokensDto = await this.keycloakService.socialLogin(
        code,
        codeVerifier,
      );
      if (keycloakTokens) {
        const accessToken = keycloakTokens.access_token;
        // Decode access token
        const decoded = this.jwtService.decode(accessToken);
        const { email, identity_provider } = decoded as AuthenticatedUserDecodedTokenDto;

        // Check if user exists in database
        const user = await this.prisma.user.findUnique({
          where: { email, role_id: { not: RoleType.Banned } },
        });

        // If user does not exist, create user in database
        if (!user) {
          const { sub, given_name, family_name, email } =
            decoded as AuthenticatedUserDecodedTokenDto;

          const userData = {
            id: sub,
            firstName: given_name,
            lastName: family_name,
            email,
            emailVerified: true,
            preferredLocaleId: 'en',
            registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
            isApple: identity_provider === IdentityProvider.Apple,
            isGoogle: identity_provider === IdentityProvider.Google,
            isFacebook: identity_provider === IdentityProvider.Facebook,
          };

          // Create user in database
          const newUser = await this.userService.createUser(userData);

          return {
            userData: newUser,
            keycloakTokens,
          };
        }

        return {
          userData: user,
          keycloakTokens,
        };
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Login
   * @param reqBody
   * @returns tokens
   */
  async login(reqBody: AuthUserDto) {
    const { email, password } = reqBody;
    // Check if user exists in database
    try {
      const user: UserDto = await this.prisma.user.findUnique({
        where: {
          email: email,
          role_id: { not: RoleType.Banned },
        },
        include: { role: true },
      });
      if (!user) {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      const updatedUser: UserDto = await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAt: new Date() },
        include: { role: true },
      });

      // Exchange username, password and obtain tokens
      return await this.keycloakService.login(email, password, updatedUser);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (error.status == HttpStatus.UNAUTHORIZED) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * getRefreshTokens
   * @param reqBody
   * @returns tokens
   */
  async getRefreshTokens(reqBody: RefreshTokenRequest) {
    // Exchange refresh token and obtain tokens
    const { refresh_token } = reqBody;
    return await this.keycloakService.refreshToken(refresh_token);
  }

  /**
   * Create Account
   * @param CreateUserDto
   * @returns Tokens
   */
  async createAccount(data: CreateAccountDto): Promise<LoginResponseDto> {
    let user: UserDto;
    let keyCloakUser: KeycloakUserDto;
    try {
      const isEmailAlreadyAvailable = await this.prisma.user.count({
        where: { email: data.email },
      });

      if (isEmailAlreadyAvailable > 0) {
        throw new InternalServerErrorException(
          'Email Already Exists, Please login to continue verification',
        );
      }

      const createKeycloakUser: KeycloakCreateUserDto = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        temporary: false,
      };

      // Create new user in keycloak
      keyCloakUser = await this.keycloakService.createUser(createKeycloakUser);

      if (!keyCloakUser?.id) {
        throw new InternalServerErrorException('User creation failed');
      }

      // Create user in database with keycloak userId
      const password = data.password;
      delete data.password;
      const formattedData: CreateUserDto = {
        ...data,
        id: keyCloakUser.id,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION],
      };

      user = await this.userService.createUser(formattedData);

      if (!user) {
        // In case of failure rollback keycloak user creation
        await this.keycloakService.deleteUser(keyCloakUser.id);
        throw new InternalServerErrorException('User creation failed');
      }

      // Fetch token from keycloak
      return plainToClass(LoginResponseDto, this.keycloakService.login(data.email, password, user));
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (!user?.id && keyCloakUser?.id) {
        await this.keycloakService.deleteUser(keyCloakUser.id);
      }
      if (error.status === HttpStatus.CONFLICT) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException(
        error.message ? error.message : 'User creation failed',
      );
    }
  }

  /**
   *  Send Otp
   * @param keycloakUserId
   */
  async sendOtp(keycloakUserId: string): Promise<UserDtoWithOtpExpiration> {
    try {
      // 1: check if user exists && registration status
      const user = await this.prisma.user.findFirst({
        where: {
          id: keycloakUserId,
          registrationStatus: {
            in: [REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION]],
          },
          role_id: { not: RoleType.Banned },
        },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const codeExpirationPeriod = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)[
        'OTP_EXPIRATION_PERIOD'
      ];

      // Note: Email OTP Code expiration is set to 60(s), with in that 1 minute user can not request new code
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

      // 2: generate OTP
      const code = await generateOTP();

      const expiresAt = new Date(Date.now() + +codeExpirationPeriod * 1000);

      const data: EmailOtpDto = {
        emailVerifyUserId: user.id,
        email: user.email,
        code,
        expiresAt,
        confirmationAttempts: EMAIL_CONFIRMATION_OTP_ATTEMPTS,
      };

      // 3: create email otp record
      const emailOtp = await this.prisma.emailOtp.create({ data });

      // 4: Update user status
      const updatedUser: LoginResponseDto['userData'] = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailOtpId: emailOtp.id,
          emailOtpSentAt: new Date(),
          registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION],
        },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        to: updatedUser.email,
        subject: `Welcome to ${MAIL_FROM}`,
      };

      // 4: Send mail notification
      await this.mailService.sendMail(mailOptions, {
        templateName: EMAIL_TEMPLATES.VERIFY_EMAIL,
        templateVars: {
          code,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
        },
      });

      const response = { ...updatedUser, emailOtpExpiresAt: expiresAt };

      return plainToClass(UserDtoWithOtpExpiration, response);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Otp creation failed');
    }
  }

  /**
   *  Verify otp
   * @param code
   * @param keycloakUserId
   */
  async verifyOtp(code: string, keycloakUserId: string): Promise<UserDto> {
    try {
      // 1: check if user exists && registration status is pending verification
      const user = await this.prisma.user.findFirst({
        where: {
          id: keycloakUserId,
          registrationStatus: {
            in: [REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION]],
          },
          role_id: { not: RoleType.Banned },
        },
      });
      if (!user) {
        throw new BadRequestException('User not found or User already verified email');
      }
      // 2: verify OTP
      const emailOtpRecord = await this.prisma.emailOtp.findFirst({
        where: {
          id: user.emailOtpId,
        },
      });

      if (emailOtpRecord.confirmationAttempts === 0) {
        throw new BadRequestException('Maximum attempts exceeded');
      }

      const isVerified = emailOtpRecord.code === code;

      if (!isVerified) {
        await this.prisma.emailOtp.update({
          where: {
            id: emailOtpRecord.id,
          },
          data: {
            confirmationAttempts: --emailOtpRecord.confirmationAttempts,
          },
        });
        throw new BadRequestException('Otp is not verified');
      }

      const isExpired = Date.now() >= new Date(emailOtpRecord.expiresAt).getTime();

      if (isExpired) {
        throw new BadRequestException('Otp is expired');
      }
      return await this.prisma.$transaction(async (tx) => {
        await tx.emailOtp.delete({
          where: { id: emailOtpRecord.id },
        });

        const updatedUser: LoginResponseDto['userData'] = await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerified: isVerified,
            registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
            emailOtpId: null,
          },
        });

        return plainToClass(UserDto, updatedUser);
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Otp verification failed');
    }
  }

  /**
   *  Emergency Contact
   * @param EmergencyContactDto
   * @param keycloakUserId
   */
  async emergencyContact(data: EmergencyContactDto, keycloakUserId: string): Promise<UserDto> {
    try {
      // 1: check if user exists && registration status is pending verification
      const user = await this.prisma.user.findFirst({
        where: {
          id: keycloakUserId,
          registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
          role_id: { not: RoleType.Banned },
        },
      });
      if (!user) {
        throw new BadRequestException(
          'User not found or User already registered emergency contact',
        );
      }

      // 2: Create emergency contact for the user
      const formattedData: EmergencyContactExtendedDto = {
        ...data,
        userId: user.id,
      };
      return await this.prisma.$transaction(async (tx) => {
        // 3: update the emergency contact
        await tx.emergencyContact.create({
          data: formattedData,
        });

        // 4: update the registration status
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
          },
        });
        return plainToClass(UserDto, updatedUser);
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Emergency contact creation failed');
    }
  }

  /**
   *  User Consent
   */
  async userConsent(keycloakUserId: string): Promise<UserDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: keycloakUserId,
          registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
          role_id: { not: RoleType.Banned },
        },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          registrationStatus: REGISTRATION_STATUS[STATUS_CODE.COMPLETE],
        },
      });

      return plainToClass(UserDto, updatedUser);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('User consent update failed');
    }
  }

  /**
   * Create Account
   * @param CreateUserDto
   * @returns Tokens
   */
  async createUserAdmin(data: CreateAccountAdminDto): Promise<UserDto> {
    let user: UserDto;
    let keyCloakUser: KeycloakUserDto;

    const ramdomPassword = await generateRandomString();
    try {
      const createKeycloakUser: KeycloakCreateUserDto = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: ramdomPassword,
        temporary: true,
      };

      // Create new user in keycloak
      keyCloakUser = await this.keycloakService.createUser(createKeycloakUser);

      if (!keyCloakUser?.id) {
        throw new InternalServerErrorException('User creation failed');
      }

      // Create user in database with keycloak userId
      const formattedData: CreateUserDto = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        nationalityCode: data.nationalityCode,
        countryCode: data.countryCode,
        contactNumber: data.contactNumber,
        passportNumber: data.passportNumber,
        nicNumber: data.nicNumber,
        dateOfBirth: data.dateOfBirth,
        preferredLocaleId: data.preferredLocaleId,
        id: keyCloakUser.id,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
        profileImageKey: data.profileImageKey,
        role_id: data.role_id,
        contactNumberNationalityCode: data.contactNumberNationalityCode,
      };

      user = await this.userService.createUser(formattedData);

      if (!user) {
        // In case of failure rollback keycloak user creation
        this.keycloakService.deleteUser(keyCloakUser.id);
        throw new InternalServerErrorException('User creation failed');
      }
      if (data.emergencyContactFullName !== '') {
        user = await this.emergencyContact(
          {
            name: data.emergencyContactFullName,
            relationship: data.emergencyContactRelationship,
            contactNumber: data.emergencyContactNumber,
            countryCode: data.emergencyContactCountryCode,
            contactNumberNationalityCode: data.emergencyContactNumberNationalityCode,
          },
          keyCloakUser.id,
        );
      }
      return plainToClass(UserDto, user);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      if (!user?.id && keyCloakUser?.id) {
        await this.keycloakService.deleteUser(keyCloakUser.id);
      }
      if (error.status === HttpStatus.CONFLICT) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException('User creation failed');
    }
  }

  async logout(sub: string): Promise<boolean> {
    try {
      return await this.keycloakService.logout(sub);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'auth' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }
}
