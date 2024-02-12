import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../common/mock-modules/abilities.guard.mock';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { NoticeRepository } from '../notice/notice.repository';
import { NoticeService } from '../notice/notice.service';
import { NoticeQueuePublisher } from '../notice/queue/notice.publisher';
import { OrderRepository } from '../order/order.repository';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { FcmTokenDto } from './dto/fcm-token.dto';
import { FcmTokensController } from './fcm-tokens.controller';
import { FcmTokensService } from './fcm-tokens.service';

describe('FcmTokensController', () => {
  let fcmController: FcmTokensController;
  let app: INestApplication;
  let createdUser: UserDto;
  let prisma: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;
  const randUUID = uuidv4();
  let userService: UserService;

  const userRequest = {
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

  const fcmTokenRequest1 = {
    id: uuidv4(),
    userId: userRequest.id,
    token: 'test_token_1',
    deviceToken: 'test_device_token_1',
  };

  const fcmTokenRequest2 = {
    id: uuidv4(),
    userId: userRequest.id,
    token: 'test_token_2',
    deviceToken: 'test_device_token_2',
  };

  const mockedUser = {
    sub: userRequest.id,
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
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

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [FcmTokensController, UserController],
      providers: [
        FcmTokensService,
        UserService,
        PassesService,
        PrismaService,
        UserRepository,
        StaticContentService,
        StaticContentRepository,
        NoticeService,
        NoticeRepository,
        StageService,
        StageRepository,
        OrderRepository,
        PassInventoryService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    fcmController = module.get<FcmTokensController>(FcmTokensController);
    prisma = module.get(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    userService = module.get<UserService>(UserService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    const responseCreateUser = await userService.createUser(userRequest);

    createdUser = Object.assign({}, responseCreateUser);
  });

  it('should be defined', () => {
    expect(fcmController).toBeDefined();
  });

  describe('Create fcm token', () => {
    it('should create a fcm token', async () => {
      const firstFcmToken = await fcmController.createFcmToken(mockedUser, fcmTokenRequest1);

      const secondFcmToken = await fcmController.createFcmToken(
        {
          sub: userRequest.id,
        },
        fcmTokenRequest2,
      );

      const expected = [
        {
          id: fcmTokenRequest1.id,
          userId: fcmTokenRequest1.userId,
          token: fcmTokenRequest1.token,
          deviceToken: fcmTokenRequest1.deviceToken,
        },
        {
          id: fcmTokenRequest2.id,
          userId: fcmTokenRequest2.userId,
          token: fcmTokenRequest2.token,
          deviceToken: fcmTokenRequest2.deviceToken,
        },
      ];

      const transformed: FcmTokenDto[] = [firstFcmToken.data, secondFcmToken.data];
      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Get fcm tokens by user id', () => {
    it('should return fcm tokens of particular user', async () => {
      const response = await fcmController.getFcmTokensByUserId(mockedUser);

      const expected = [
        {
          id: fcmTokenRequest1.id,
          userId: fcmTokenRequest1.userId,
          token: fcmTokenRequest1.token,
          deviceToken: fcmTokenRequest1.deviceToken,
        },
        {
          id: fcmTokenRequest2.id,
          userId: fcmTokenRequest2.userId,
          token: fcmTokenRequest2.token,
          deviceToken: fcmTokenRequest2.deviceToken,
        },
      ];

      expect(response.data).toStrictEqual(expected);
    });
  });

  describe('Delete fcm tokens by user id', () => {
    it('should delete fcm tokens of particular user', async () => {
      const response = await fcmController.removeFcmTokensByUserId(mockedUser);

      const expected = { count: 2 };

      expect(response).toStrictEqual(expected);
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: createdUser.email } });
    await prisma.$disconnect();
    await app.close();
  });
});
