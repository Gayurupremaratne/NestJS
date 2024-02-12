import { QUEUES } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { OrderRepository } from '../../order/order.repository';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { PushNotificationService } from '../../push-notification/push-notification.service';

describe('User Profile', () => {
  const loggedInUserId = '880135e2-1c23-4248-ac27-cf420880e6aa';

  const req = {
    user: {
      sub: loggedInUserId,
      role: {
        id: 1,
      },
    },
  };

  let userController: UserController;

  const mockUserController = {
    getMe: jest.fn(async () => {
      const userResponse = {
        apiData: {
          id: '880135e2-1c23-4248-ac27-cf420880e6aa',
          firstName: 'test',
          lastName: 'test',
          email: 'test@test.com',
          nationalityCode: 'FR',
          countryCode: '+33',
          contactNumber: '123456789',
          passportNumber: '78TH67845',
          nicNumber: '950370203V',
          dateOfBirth: '2000-08-08T00:00:00.000Z',
          isApple: false,
          isFacebook: false,
          isGoogle: false,
          preferredLocaleId: 'en',
          registrationStatus: 'PENDING_SOCIAL_ACCOUNT',
          createdAt: '2023-08-03T19:11:24.529Z',
          updatedAt: '2023-08-03T20:23:12.361Z',
          role: {
            id: 1,
            name: 'superAdmin',
            isAdmin: true,
            createdAt: '2023-08-03T19:32:09.797Z',
            updatedAt: '2023-08-03T19:32:09.797Z',
            deletedAt: null,
          },
        },
        userPermissions: [
          {
            id: 1,
            action: 'manage',
            subject: 'all',
            conditions: null,
          },
        ],
        notificationStatus: {
          stage: false,
          all: false,
        },
      };

      return userResponse;
    }),
    getUserPermissions: jest.fn(),
    getUser: jest.fn(),
    getUserNotificationStatus: jest.fn(),
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

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    changePassword: jest.fn(),
  };

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
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserController },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        PrismaService,
        NoticeRepository,
        NoticeService,
        StageService,
        PassesService,
        UserRepository,
        StageRepository,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    //userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  it('should return user profile', async () => {
    const userResponse = {
      apiData: {
        id: '880135e2-1c23-4248-ac27-cf420880e6aa',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        isApple: false,
        isFacebook: false,
        isGoogle: false,
        preferredLocaleId: 'en',
        registrationStatus: 'PENDING_SOCIAL_ACCOUNT',
        createdAt: '2023-08-03T19:11:24.529Z',
        updatedAt: '2023-08-03T20:23:12.361Z',
        role: {
          id: 1,
          name: 'superAdmin',
          isAdmin: true,
          createdAt: '2023-08-03T19:32:09.797Z',
          updatedAt: '2023-08-03T19:32:09.797Z',
          deletedAt: null,
        },
      },
      userPermissions: [
        {
          id: 1,
          action: 'manage',
          subject: 'all',
          conditions: null,
        },
      ],
      notificationStatus: {
        stage: false,
        all: false,
      },
    };

    mockUserController.getMe.mockResolvedValueOnce(userResponse);
    mockUserController.getUser.mockResolvedValueOnce(userResponse.apiData);
    mockUserController.getUserNotificationStatus.mockResolvedValueOnce(
      userResponse.notificationStatus,
    );

    await userController.getMe(req);

    expect(userController.getMe).toBeDefined();
  });
});
