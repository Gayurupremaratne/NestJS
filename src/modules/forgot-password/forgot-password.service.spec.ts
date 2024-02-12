import { RESET_PASSWORD_OTP_ATTEMPTS, STATUS_CODE } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { REGISTRATION_STATUS } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../auth/auth.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { StaticContentService } from '../static-content/static-content.service';
import { ForgotPasswordService } from './forgot-password.service';

describe('ForgotPasswordService', () => {
  let forgotPasswordService: ForgotPasswordService;
  let prisma: PrismaService;
  let userService: UserService;
  const randUUID = uuidv4();

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const createUserDto: CreateUserDto = {
    id: uuidv4(),
    firstName: 'test',
    lastName: 'test',
    email: `test${randUUID}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const invalidEmail = 'invalid@email.com';

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        ForgotPasswordService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    forgotPasswordService = moduleRef.get(ForgotPasswordService);
    userService = moduleRef.get(UserService);

    await userService.createUser(createUserDto);
  });

  it('should be defined', () => {
    expect(forgotPasswordService).toBeDefined();
  });

  describe('Forgot Password', () => {
    it('should send password otp successfully', async () => {
      const response = await forgotPasswordService.forgotPassword(createUserDto.email);
      expect(response).toEqual(
        expect.objectContaining({
          emailOtpSentAt: expect.anything(),
          emailOtpExpiresAt: expect.anything(),
        }),
      );
    });

    it('should send password otp to invalid email', async () => {
      const response = await forgotPasswordService.forgotPassword(invalidEmail);

      expect(response).toEqual(
        expect.objectContaining({
          emailOtpSentAt: expect.anything(),
          emailOtpExpiresAt: expect.anything(),
        }),
      );
    });

    it('otp limit exceeded exception', async () => {
      const mockUser = { ...createUserDto, emailOtpSentAt: Date.now() - 500 * 1000 };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      try {
        await forgotPasswordService.forgotPassword(createUserDto.email);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('Reset Password', () => {
    it('should reset password successfully', async () => {
      const emailOtpRecord = await prisma.emailOtp.findFirst({
        where: { passwordResetUserId: createUserDto.id },
        orderBy: {
          createdAt: 'desc',
        },
      });
      emailOtpRecord.expiresAt = new Date(Date.now() + 60000);
      emailOtpRecord.passwordResetUserId = createUserDto.id;

      const prismaMock = {
        $transaction: jest.fn().mockImplementation((callback) => callback(prismaMock)),
        emailOtp: {
          delete: jest.fn(),
          update: jest.fn(),
        },
        user: {
          update: jest.fn().mockReturnValue({
            ...createUserDto,
            passwordResetOtpId: null,
          }),
        },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation((callback) => callback(prismaMock));

      const response = await forgotPasswordService.resetPassword({
        code: emailOtpRecord.code,
        email: createUserDto.email,
        newPassword: 'Test@123',
      });

      expect(response).toMatchObject(createUserDto);
    });
  });

  describe('Verify Otp', () => {
    it('should verify password otp successfully', async () => {
      const mockOtpRecord = {
        id: uuidv4(),
        email: createUserDto.email,
        code: '1234',
        password_reset_user_id: createUserDto.id,
      };
      const mockUser = { ...createUserDto, password_reset_otp_id: mockOtpRecord.id };
      const prismaMock = {
        $transaction: jest.fn().mockImplementation((callback) => callback(prismaMock)),
        emailOtp: {
          update: jest.fn(),
        },
        user: {
          update: jest.fn(),
        },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation((callback) => callback(prismaMock));
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockOtpRecord as any);
      const response = await forgotPasswordService.verifyRecoveryCode({
        code: '1234',
        email: createUserDto.email,
      });
      expect(response.verified).toBeTruthy();
    });

    it('should expire password otp', async () => {
      const mockEmailOtpRecord = {
        id: 'mockEmailOtpId',
        code: '1234',
        expiresAt: new Date(Date.now() - 600000), // Set the expiration time to the past
        userId: 'mockUserId',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUser = {
        ...createUserDto,
        password_reset_otp_id: mockEmailOtpRecord.id,
        emailOtpSentAt: Date.now() - 500 * 1000,
      };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockEmailOtpRecord as any);

      try {
        await forgotPasswordService.verifyRecoveryCode({
          code: '1234',
          email: createUserDto.email,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should not verify password otp', async () => {
      const mockEmailOtpRecord = {
        id: 'mockEmailOtpId',
        code: '1234',
        expiresAt: new Date(Date.now() - 600000), // Set the expiration time to the past
        userId: 'mockUserId',
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmationAttempts: RESET_PASSWORD_OTP_ATTEMPTS,
      };
      const mockUser = {
        ...createUserDto,
        password_reset_otp_id: mockEmailOtpRecord.id,
        emailOtpSentAt: Date.now() - 500 * 1000,
      };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockEmailOtpRecord as any);
      jest.spyOn(prisma.emailOtp, 'update').mockResolvedValue({} as any);

      try {
        await forgotPasswordService.verifyRecoveryCode({
          code: '1034',
          email: createUserDto.email,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw error for trying to validate more than the allowed limit', async () => {
      const mockEmailOtpRecord = {
        id: 'mockEmailOtpId',
        code: '1234',
        expiresAt: new Date(),
        userId: 'mockUserId',
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmationAttempts: 0,
      };
      const mockUser = {
        ...createUserDto,
        password_reset_otp_id: mockEmailOtpRecord.id,
        emailOtpSentAt: Date.now() + 500 * 1000,
      };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockEmailOtpRecord as any);
      jest.spyOn(prisma.emailOtp, 'update').mockResolvedValue({} as any);

      try {
        await forgotPasswordService.verifyRecoveryCode({
          code: '1234',
          email: createUserDto.email,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: createUserDto.email } });
    await prisma.$disconnect();
  });
});
