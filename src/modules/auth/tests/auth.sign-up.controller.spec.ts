import { JsonResponseSerializer } from '@common/serializers';
import { CustomAuthRequest, IAppConfig } from '@common/types';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  CONFIG_NAMESPACES,
  PLATFORM,
  QUEUES,
  REGISTRATION_STATUS,
  STATUS_CODE,
} from '../../../common/constants';
import { LoginResponseDto } from '../../keycloak/dto/keycloak.dto';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentService } from '../../static-content/static-content.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CreateAccountAdminDto } from '../dto/create-account-admin.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('AuthController', () => {
  let app: INestApplication;
  let authController: AuthController;
  let authService: AuthService;
  let userService: UserService;
  let configService: ConfigService;
  const randUUID = uuidv4();

  const mockAuthService = {
    login: jest.fn(),
    socialLogin: jest.fn(),
    createAccount: jest.fn(),
    createUserAdmin: jest.fn(),
    createUser: jest.fn(async () => {
      return {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
      };
    }),
  };

  const mockHeadersDto = {
    platform: PLATFORM.mobile,
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
      controllers: [AuthController],
      providers: [
        { provide: KeycloakService, useValue: mockAuthService },
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        PassesService,
        UserRepository,
        ConfigService,
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

    app = module.createNestApplication();
    await app.init();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  const mockCreateAccountPayload: CreateAccountDto = {
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

  const mockCreateAccountResponse: LoginResponseDto = {
    userData: {
      firstName: 'First',
      lastName: 'Last',
      email: `test${randUUID}@email.com`,
      nationalityCode: 'FR',
      countryCode: '+33',
      contactNumber: '123456789',
      passportNumber: '78TH67845',
      nicNumber: '950370203V',
      dateOfBirth: expect.any(Object),
      preferredLocaleId: 'en',
      registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_VERIFICATION],
      createdAt: expect.any(Object),
      updatedAt: expect.any(Object),
      id: expect.any(Object),
      passwordResetOtpId: '',
      emailOtpId: '',
      role_id: 1,
    },
    keycloakTokens: {
      access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
      refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
      expires_in: 600,
      refresh_expires_in: 602997,
      id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
      token_type: 'Bearer',
      scope: 'profile email',
      session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
      'not-before-policy': 0,
    },
  };

  const mockCreateAccountAdminPayload: CreateAccountAdminDto = {
    contactNumber: '0123456789',
    countryCode: '+33',
    dateOfBirth: '2023-08-11',
    email: `test${randUUID}@email.com`,
    emergencyContactCountryCode: '+33',
    emergencyContactFullName: 'Emergency contact name',
    emergencyContactNumber: '0123456789',
    emergencyContactRelationship: 'Brother',
    firstName: 'First',
    lastName: 'Last',
    nationalityCode: 'FR',
    passportNumber: '78TH67845',
    profileImageKey: '',
    preferredLocaleId: 'en',
    role_id: 2,
  };

  const mockCreateAccountAdminResponse: UserDto = {
    id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
    firstName: 'First',
    lastName: 'Last',
    email: `test${randUUID}@email.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '0123456789',
    passportNumber: '78TH67845',
    nicNumber: null,
    dateOfBirth: new Date('2023-08-11'),
    emailOtpSentAt: null,
    profileImageKey: '',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
    createdAt: new Date('2023-08-11'),
    updatedAt: new Date('2023-08-11'),
    passwordResetOtpId: '',
    emailOtpId: '',
  };

  describe('Create Account', () => {
    it('should create account successfully in platform mobile', async () => {
      jest.spyOn(authService, 'createAccount').mockResolvedValue(mockCreateAccountResponse);
      jest
        .spyOn(authController, 'createAccount')
        .mockResolvedValueOnce(JsonResponseSerializer(mockCreateAccountResponse));

      const response = await request(app.getHttpServer())
        .post('/create-account')
        .set('Content-Type', 'application/json')
        .set('platform', mockHeadersDto.platform)
        .send(mockCreateAccountPayload);

      expect(response.status).toBe(201);
      expect(response.body.data).toStrictEqual(mockCreateAccountResponse);
    });

    it('should create account successfully in platform web', async () => {
      mockCreateAccountPayload.email = `test${uuidv4()}@example.com`;
      jest.spyOn(authService, 'createAccount').mockResolvedValueOnce(mockCreateAccountResponse);
      jest
        .spyOn(authController, 'createAccount')
        .mockResolvedValueOnce(JsonResponseSerializer(mockCreateAccountResponse));

      const response = await request(app.getHttpServer())
        .post('/create-account')
        .set('Content-Type', 'application/json')
        .set('platform', PLATFORM.web)
        .send(mockCreateAccountResponse);

      expect(response.status).toBe(201);

      // Check if the cookie is set
      const refreshTokenCookie = response.headers['set-cookie'].find((cookie) =>
        cookie.startsWith('refresh_token='),
      );
      expect(refreshTokenCookie).toBeDefined();

      // Extract the refresh token value from the cookie
      const refreshTokenValue = refreshTokenCookie.split('=')[1].split(';')[0];

      // Check if the refresh token value in the cookie matches the mocked value
      expect(refreshTokenValue).toBe('eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI');
    });
  });

  describe('Send Otp Email', () => {
    it('should send verify otp email successfully', async () => {
      const otp_expire_period = configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)[
        'OTP_EXPIRATION_PERIOD'
      ];
      const mockResponse = {
        ...mockCreateAccountResponse.userData,
        emailOtpId: uuidv4(),
        emailOtpSentAt: new Date(),
        emailOtpExpiresAt: new Date(Date.now() + +otp_expire_period * 1000),
      };
      jest.spyOn(authService, 'sendOtp').mockResolvedValue(mockResponse);

      const mockUserId = 'mockUserId';
      const mockRequest = {
        user: {
          sub: mockUserId,
        },
      };
      const response = await authController.sendOtp(mockRequest as unknown as CustomAuthRequest);
      expect(authService.sendOtp).toHaveBeenCalledWith(mockUserId);
      expect(response.data.emailOtpId).not.toBeNull();
      expect(response.data.emailOtpSentAt).toBeInstanceOf(Date);
    });
  });

  describe('Verify Otp Code', () => {
    it('should verify otp code successfully', async () => {
      const mockResponse = {
        ...mockCreateAccountResponse.userData,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
      };
      jest.spyOn(authService, 'verifyOtp').mockResolvedValue(mockResponse);

      const mockUserId = 'mockUserId';
      const mockRequest = {
        user: {
          sub: mockUserId,
        },
      };
      const response = await authController.verifyEmail(
        mockRequest as unknown as CustomAuthRequest,
        { code: '1234' },
      );
      expect(authService.verifyOtp).toHaveBeenCalledWith('1234', mockUserId);
      expect(response.data.registrationStatus).toBe(
        REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY],
      );
    });
  });

  describe('User Consent', () => {
    it('should update user consent successfully', async () => {
      const mockResponse = {
        ...mockCreateAccountResponse.userData,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.COMPLETE],
      };
      jest.spyOn(authService, 'userConsent').mockResolvedValue(mockResponse);

      const mockUserId = 'mockUserId';
      const mockRequest = {
        user: {
          sub: mockUserId,
        },
      };

      const response = await authController.userConsent(
        mockRequest as unknown as CustomAuthRequest,
      );
      expect(authService.userConsent).toHaveBeenCalledWith(mockUserId);
      expect(response.data.registrationStatus).toBe(REGISTRATION_STATUS[STATUS_CODE.COMPLETE]);
    });
  });

  describe('Emergency Contact', () => {
    it('should create emergency contact successfully', async () => {
      const mockResponse = {
        ...mockCreateAccountResponse.userData,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
      };
      jest.spyOn(authService, 'emergencyContact').mockResolvedValue(mockResponse);

      const mockUserId = 'mockUserId';
      const mockRequest = {
        user: {
          sub: mockUserId,
        },
      };

      const mockEmergencyContact = {
        countryCode: 'SL',
        contactNumber: '94770911324',
        name: 'Mock User',
        relationship: 'Tester',
        contactNumberNationalityCode: 'LK',
      };

      const response = await authController.emergencyContact(
        mockRequest as unknown as CustomAuthRequest,
        mockEmergencyContact,
      );
      expect(authService.emergencyContact).toHaveBeenCalledWith(mockEmergencyContact, mockUserId);
      expect(response.data.registrationStatus).toBe(
        REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
      );
    });
  });

  describe('Create User Admin', () => {
    it('should create user in admin successfully', async () => {
      jest.spyOn(userService, 'createUser').mockResolvedValue(mockCreateAccountAdminResponse);
      jest.spyOn(authService, 'emergencyContact').mockResolvedValue(mockCreateAccountAdminResponse);

      const response = await authController.createUserAdmin(mockCreateAccountAdminPayload);
      expect(response.data.registrationStatus).toBe(
        REGISTRATION_STATUS[STATUS_CODE.PENDING_CONSENT],
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
