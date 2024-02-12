import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { NOTICE_CATEGORY, NOTICE_CATEGORY_CODE } from '@common/constants/notice_category.constants';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { $Enums } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { NoticeRepository } from '../notice/notice.repository';
import { NoticeService } from '../notice/notice.service';
import { OrderRepository } from '../order/order.repository';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PushNotificationConsumer } from './push-notification.consumer';
import { PushNotificationController } from './push-notification.controller';
import { PushNotificationRepository } from './push-notification.repository';
import { PushNotificationService } from './push-notification.service';
import { NoticeQueuePublisher } from '../notice/queue/notice.publisher';

describe('PushNotificationService', () => {
  let controller: PushNotificationController;
  let mockAbilitiesGuard: AbilitiesGuard;
  let prisma: PrismaService;
  const userId = uuidv4();

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumer = {
    sendPushNotifications: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
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
      controllers: [PushNotificationController],
      providers: [
        PrismaService,
        PushNotificationService,
        { provide: getQueueToken(QUEUES.PUSH_NOTIFICATION), useValue: mockQueue },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        { provide: PushNotificationConsumer, useValue: mockConsumer },
        StaticContentService,
        StaticContentRepository,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        UserService,
        UserRepository,
        PassesService,
        KeycloakService,
        PushNotificationRepository,
        NoticeRepository,
        NoticeService,
        StageRepository,
        StageService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailService, useValue: mockMailService },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
      ],
    }).compile();

    controller = module.get<PushNotificationController>(PushNotificationController);
    prisma = module.get<PrismaService>(PrismaService);

    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    await prisma.user.create({
      data: {
        id: userId,
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
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
      },
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send push notifications email', async () => {
    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'title',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.EMAIL,
      isRead: false,
    };

    const spy = jest.spyOn(controller, 'sendBatchedNotifications');
    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);
    const response = await controller.sendBatchedNotifications(payload);

    expect(response.data).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(payload);
  });

  it('should send push notifications notification', async () => {
    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'title',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      isRead: false,
    };

    const spy = jest.spyOn(controller, 'sendBatchedNotifications');
    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);
    const response = await controller.sendBatchedNotifications(payload);

    expect(response.data).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(payload);
  });

  it('should get general notifications for the logged user', async () => {
    const reqUser = {
      sub: userId,
    };
    const response = await controller.getLoggedUserNotifications(reqUser, {
      category: NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.GENERAL],
      pageNumber: 1,
      perPage: 10,
    });

    expect(Array.isArray(response.data.data)).toBeTruthy();
  });

  it('should get stage-wise notifications for the logged user', async () => {
    const reqUser = {
      sub: userId,
    };
    const response = await controller.getLoggedUserNotifications(reqUser, {
      category: NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.STAGE_WISE],
      pageNumber: 1,
      perPage: 10,
    });

    expect(Array.isArray(response.data.data)).toBeTruthy();
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
