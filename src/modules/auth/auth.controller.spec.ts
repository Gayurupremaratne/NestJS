import { MockWebGuard } from '@common/mock-modules/web.guard.mock';
import { JsonResponseSerializer } from '@common/serializers';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { PLATFORM, QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '../../common/constants';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { WebGuard } from '../casl/web.guard';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { KeycloakTokensDto } from '../keycloak/dto/keycloak.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { NoticeRepository } from '../notice/notice.repository';
import { NoticeService } from '../notice/notice.service';
import { OrderRepository } from '../order/order.repository';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentService } from '../static-content/static-content.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSocialLogin } from './dto/auth-social-login.dto';
import { AuthUserDto } from './dto/auth-user';
import { NoticeQueuePublisher } from '../notice/queue/notice.publisher';
import { PushNotificationService } from '../push-notification/push-notification.service';

describe('AuthController', () => {
  let app: INestApplication;
  let authController: AuthController;
  let authService: AuthService;
  let userDto: UserDto;
  let mockWebGuard: WebGuard;
  let userService: UserService;

  const userId = uuidv4();

  const mockAuthService = {
    login: jest.fn(),
    socialLogin: jest.fn(),
    createAccount: jest.fn(),
    logout: jest.fn(async (_sub: string) => {
      return {
        statusCode: 201,
        data: [null],
      };
    }),
  };

  const normalLoginRequest: AuthUserDto = {
    email: `test${userId}@gmail.com`,
    password: '1234567',
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

  const userRequest = {
    id: userId,
    firstName: 'test',
    lastName: 'test',
    email: `test${userId}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
    role_id: 1,
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [AuthController, UserController],
      providers: [
        { provide: KeycloakService, useValue: mockAuthService },
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        OrderRepository,
        PassesService,
        UserRepository,
        NoticeRepository,
        NoticeService,
        StageService,
        PassInventoryService,
        FcmTokensService,
        StageRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: WebGuard,
          useClass: MockWebGuard,
        },

        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    mockWebGuard = module.get<WebGuard>(WebGuard);

    jest.spyOn(mockWebGuard, 'canActivate').mockImplementation(async () => true);

    const userResponse = await userService.createUser(userRequest);
    userDto = userResponse;
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('Normal Login User', () => {
    it('should login user sucessfully which header platform is mobile', async () => {
      // Mocking user data
      const userData = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      const mockResult = {
        userData: userData,
        keycloakTokens: keycloakTokens,
      };

      const finalMockResult = mockResult;

      jest.spyOn(authService, 'login').mockResolvedValueOnce(mockResult);
      jest
        .spyOn(authController, 'login')
        .mockResolvedValueOnce(JsonResponseSerializer(finalMockResult));

      const response = await request(app.getHttpServer())
        .post('/login')
        .set('Content-Type', 'application/json')
        .set('platform', mockHeadersDto.platform)
        .send(normalLoginRequest);

      expect(response.status).toBe(201);
      expect(response.body.data).toStrictEqual(finalMockResult);
    });

    it('should login user sucessfully which header platform is web', async () => {
      const platformWebHeaderDto = {
        platform: PLATFORM.web,
      };

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      const mockResult = {
        userData: userDto,
        keycloakTokens: keycloakTokens,
      };

      const finalMockResult = mockResult;

      jest.spyOn(authService, 'login').mockResolvedValueOnce(mockResult);
      jest
        .spyOn(authController, 'login')
        .mockResolvedValueOnce(JsonResponseSerializer(finalMockResult));

      const response = await request(app.getHttpServer())
        .post('/login')
        .set('Content-Type', 'application/json')
        .set('platform', platformWebHeaderDto.platform)
        .send(normalLoginRequest);

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

  describe('Social Login User', () => {
    it('should login user sucessfully', async () => {
      // Mocking user data
      const user = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      // Mocking the return value
      const mockResult = {
        userData: user,
        keycloakTokens: keycloakTokens,
      };

      // Mocking the code and the code verifier
      const authLoginSocial: AuthSocialLogin = {
        code: '47dcefe1-d7b7-4e40-95f1-a345f2177d2a.b0535b33-d2b0-4a07-875e-172f33a49e86.951a33f0-b905',
        codeVerifier:
          'a520TtMe07G5Ow2f0t0dfCcJ5_9DOpwiuRzqPT0wpYfhtzAlm_WuZJbuLl8KyzzUM9CW9eiPxV0v6HErZP4j0itXGR0YWOcwYnpSHxfFnHglEW0lemH6mYdF0bDZqutV',
      };

      jest.spyOn(authService, 'socialLogin').mockResolvedValueOnce(mockResult);

      jest
        .spyOn(authController, 'socialLogin')
        .mockResolvedValueOnce(JsonResponseSerializer(mockResult));

      const response = await request(app.getHttpServer())
        .post('/social-login')
        .send(authLoginSocial);

      expect(response.status).toBe(201);
      expect(response.body.data).toStrictEqual(mockResult);
    });
  });

  describe('logout user', () => {
    it('should logout user sucessfully', async () => {
      const response = await authController.logout('test id');

      expect(response).toBeDefined();
    });
  });
});
