import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { BadRequestException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserQueuePublisher } from '../../user/queue/user-queue.publisher';
import { UserRepository } from '../../user/user.repository';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { CreateAccountAdminDto } from '../dto/create-account-admin.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: PrismaService;
  let userService: UserService;
  const randUUID = uuidv4();

  const mockResponse = {
    userData: {
      firstName: 'First',
      lastName: 'Last',
      email: `test${randUUID}@email.com`,
      nationalityCode: 'FR',
      countryCode: '+33',
      contactNumber: '123456789',
      passportNumber: '78TH67845',
      nicNumber: '950370203V',
      dateOfBirth: new Date('2000-08-08'),
      preferredLocaleId: 'en',
      registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION],
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      id: randUUID,
    },
    keycloakTokens: {
      access_token: expect.anything(),
      refresh_token: expect.anything(),
      expires_in: expect.anything(),
      refresh_expires_in: expect.anything(),
      ['not-before-policy']: expect.anything(),
      session_state: expect.anything(),
      scope: 'profile email',
      token_type: 'Bearer',
    },
  };

  const mockKeycloakService = {
    createUser: jest.fn().mockReturnValue({
      id: randUUID,
    }),
    deleteUser: jest.fn(),
    login: jest.fn().mockReturnValue(mockResponse),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        PassesService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();
    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);
  });

  describe('CreateAccount', () => {
    const mockPayload: CreateAccountDto = {
      firstName: 'First',
      lastName: 'Last',
      email: `test${randUUID}@email.com`,
      nationalityCode: 'FR',
      countryCode: '+33',
      contactNumber: '123456789',
      passportNumber: '78TH67845',
      nicNumber: '950370203V',
      dateOfBirth: '2000-08-08',
      preferredLocaleId: 'en',
      password: 'Test@123',
    };

    it('should create account successfully', async () => {
      const response = await authService.createAccount(mockPayload);
      expect(response).toStrictEqual(expect.objectContaining(mockResponse));
    });

    it('account already exists', async () => {
      await expect(authService.createAccount(mockPayload)).rejects.toThrow(HttpException);
    });

    it('keycloak account creation failure', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockRejectedValue(new Error('User creation failed')),
      };

      const mockUserService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createAccount(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('keycloak account empty data exception', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockReturnValue(null),
      };

      const mockUserService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createAccount(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('prisma user creation failure', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const mockUserService = {
        createUser: jest.fn().mockRejectedValue(InternalServerErrorException),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createAccount(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('SendVerifyEmail', () => {
    it('should send verify email successfully', async () => {
      const response = await authService.sendOtp(randUUID);
      expect(response.emailOtpId).not.toBeNull();
    });

    it('should not sent verify email if user not exist', async () => {
      try {
        await authService.sendOtp(uuidv4());
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('VerifyOtp', () => {
    it('should not verify otp', async () => {
      try {
        await authService.verifyOtp('1234', randUUID);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should expire otp', async () => {
      const mockUser = {
        id: 'mockUserId',
        emailOtpId: 'mockEmailOtpId',
      };
      const mockEmailOtpRecord = {
        id: 'mockEmailOtpId',
        code: '1234',
        expiresAt: new Date(Date.now() - 600000), // Set the expiration time to the past
        userId: 'mockUserId',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockEmailOtpRecord as any);

      await expect(authService.verifyOtp('1234', 'mockUserId')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for trying to validate more than the allowed limit', async () => {
      const mockUser = {
        id: 'mockUserId',
        emailOtpId: 'mockEmailOtpId',
      };
      const mockEmailOtpRecord = {
        id: 'mockEmailOtpId',
        code: '1234',
        expiresAt: new Date(),
        userId: 'mockUserId',
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmationAttempts: 0,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockEmailOtpRecord as any);

      try {
        await authService.verifyOtp('1234', 'mockUserId');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should verify otp successfully', async () => {
      const mockOtpRecord = {
        id: uuidv4(),
        email: mockResponse.userData.email,
        code: '1234',
        email_verify_user_id: randUUID,
      };
      const mockUser = {
        ...mockResponse.userData,
        email_otp_id: mockOtpRecord.id,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION],
      };
      const prismaMock = {
        $transaction: jest.fn().mockImplementation((callback) => callback(prismaMock)),
        emailOtp: {
          delete: jest.fn(),
        },
        user: {
          update: jest.fn().mockReturnValue({
            ...mockResponse,
            registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
          }),
        },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation((callback) => callback(prismaMock));
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValue(mockOtpRecord as any);
      const response = await authService.verifyOtp('1234', randUUID);
      expect(response.registrationStatus).toBe(REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY]);
    });
  });

  describe('EmergencyContact', () => {
    const mockEmergencyContact = {
      countryCode: 'SL',
      contactNumber: '94770911324',
      name: 'Mock User',
      relationship: 'Tester',
      contactNumberNationalityCode: 'LK',
    };

    it('should add emergency contact successfully', async () => {
      const prismaMock = {
        $transaction: jest.fn().mockImplementation((callback) => callback(prismaMock)),
        emergencyContact: {
          create: jest.fn(),
        },
        user: {
          update: jest.fn().mockReturnValue({
            ...mockResponse.userData,
            registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
          }),
        },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation((callback) => callback(prismaMock));
      const response = await authService.emergencyContact(mockEmergencyContact, randUUID);
      expect(response.registrationStatus).toEqual(REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT]);
    });

    it('should failed to add emergency contact', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockRejectedValueOnce(new Error());

      await expect(authService.emergencyContact(mockEmergencyContact, randUUID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should failed to add emergency contact unregistered user', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockReturnValue(null);

      await expect(authService.emergencyContact(mockEmergencyContact, randUUID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('UserConsent', () => {
    it('should update user consent successfully', async () => {
      const mock = {
        ...mockResponse.userData,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
      };
      jest.spyOn(prisma.user, 'findFirst').mockReturnValue(mock as any);
      const response = await authService.userConsent(randUUID);
      expect(response.registrationStatus).toEqual(REGISTRATION_STATUS[STATUS_CODE.COMPLETE]);
    });

    it('should not update user consent', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockRejectedValueOnce(new Error());

      await expect(authService.userConsent(randUUID)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('CreateUserAdmin', () => {
    const mockPayload: CreateAccountAdminDto = {
      firstName: 'First Test',
      lastName: 'Last Test',
      email: `test1${randUUID}@email.com`,
      nationalityCode: 'FR',
      countryCode: '+33',
      contactNumber: '123456789',
      passportNumber: '78TH67845',
      dateOfBirth: '2000-08-08',
      emergencyContactCountryCode: '+33',
      emergencyContactFullName: 'Emergency contact name',
      emergencyContactNumber: '0123456789',
      emergencyContactRelationship: 'Brother',
      preferredLocaleId: 'en',
      profileImageKey: '',
      role_id: 2,
    };

    it('should create account successfully', async () => {
      jest.spyOn(userService, 'createUser').mockResolvedValueOnce(null);

      await expect(authService.createUserAdmin(mockPayload)).rejects.toThrow(HttpException);
    });

    it('account already exists', async () => {
      await expect(authService.createUserAdmin(mockPayload)).rejects.toThrow(HttpException);
    });

    it('keycloak account creation failure', async () => {
      const mockKeycloakService = {
        createUser: jest
          .fn()
          .mockRejectedValue(new InternalServerErrorException('User creation failed')),
      };

      const mockUserService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createUserAdmin(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('keycloak user exist and user creation failiure', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const mockUserService = {
        createUser: jest.fn().mockRejectedValue(new Error('User creation failed')),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createUserAdmin(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('keycloak account empty data exception', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockReturnValue(null),
      };

      const mockUserService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createUserAdmin(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('prisma user creation failure', async () => {
      const mockKeycloakService = {
        createUser: jest.fn().mockResolvedValue(null),
      };

      const mockUserService = {
        createUser: jest.fn().mockRejectedValue(InternalServerErrorException),
      };

      const authService = new AuthService(
        mockKeycloakService as unknown as KeycloakService,
        prisma,
        {} as unknown as JwtService,
        mockUserService as unknown as UserService,
        {} as unknown as MailService,
        {} as unknown as ConfigService,
      );

      try {
        mockPayload.email = `test${uuidv4()}@example.com`;
        await authService.createUserAdmin(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: mockResponse.userData.email } });
    await prisma.$disconnect();
  });
});
