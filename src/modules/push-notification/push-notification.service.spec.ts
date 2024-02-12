import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationService } from './push-notification.service';
import { Job, Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { PushNotificationConsumer } from './push-notification.consumer';
import { PrismaService } from '@prisma-orm/prisma.service';
import { CreatePushNotificationDto } from './dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { $Enums } from '@prisma/client';
import { PushNotificationRepository } from './push-notification.repository';
import { NOTICE_CATEGORY, NOTICE_CATEGORY_CODE } from '@common/constants/notice_category.constants';
import { UpdateNotificationReadStatusDto } from './dto/update-notification-read-status.dto';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  messaging: jest.fn(() => ({
    send: jest.fn(async (payload) => {
      if (payload.notification.title === 'error') {
        throw { errorInfo: { code: 'error', message: 'error' } };
      }
    }),
    sendEachForMulticast: jest.fn().mockResolvedValue('mock-response'),
  })),
}));

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let consumer: PushNotificationConsumer;
  let prisma: PrismaService;
  const userId = uuidv4();

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        PushNotificationRepository,
        { provide: getQueueToken(QUEUES.PUSH_NOTIFICATION), useValue: mockQueue },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        PushNotificationConsumer,
        PrismaService,
      ],
    }).compile();
    prisma = module.get(PrismaService);
    service = module.get<PushNotificationService>(PushNotificationService);
    consumer = module.get<PushNotificationConsumer>(PushNotificationConsumer);

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
    expect(service).toBeDefined();
  });

  it('should send push notifications email', async () => {
    const serviceSpy = jest.spyOn(service, 'sendBatchedNotifications');
    const consumerSpy = jest.spyOn(consumer, 'sendPushNotifications');

    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'title',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.EMAIL,
      isRead: true,
    };

    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);

    // consumer dependencies firebase-admin & prisma are mocked
    consumer.sendPushNotifications({ data: payload } as unknown as Job<CreatePushNotificationDto>);

    const response = await service.sendBatchedNotifications(payload);

    expect(serviceSpy).toHaveBeenCalledWith(payload);
    expect(consumerSpy).toHaveBeenCalledWith({ data: payload });
    expect(response).toBeUndefined();
  });

  it('should send push notifications notification', async () => {
    const serviceSpy = jest.spyOn(service, 'sendBatchedNotifications');
    const consumerSpy = jest.spyOn(consumer, 'sendPushNotifications');

    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'title',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      isRead: false,
    };

    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);

    // consumer dependencies firebase-admin & prisma are mocked
    consumer.sendPushNotifications({ data: payload } as unknown as Job<CreatePushNotificationDto>);

    const response = await service.sendBatchedNotifications(payload);

    expect(serviceSpy).toHaveBeenCalledWith(payload);
    expect(consumerSpy).toHaveBeenCalledWith({ data: payload });
    expect(response).toBeUndefined();
  });

  it('should fail sending push notifications', async () => {
    jest.spyOn(service, 'sendBatchedNotifications');
    jest.spyOn(consumer, 'sendPushNotifications');

    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'error',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      isRead: false,
    };

    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);

    // consumer dependencies firebase-admin & prisma are mocked
    consumer.sendPushNotifications({
      data: payload,
    } as unknown as Job<CreatePushNotificationDto>);

    try {
      await service.sendBatchedNotifications(payload);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should get general notifications for the logged user', async () => {
    const response = await service.getLoggedUserNotifications(userId, {
      category: NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.GENERAL],
      pageNumber: 1,
      perPage: 10,
    });

    expect(Array.isArray(response.data)).toBeTruthy();
  });

  it('should fail consuming push notifications', async () => {
    jest.spyOn(service, 'sendBatchedNotifications');
    jest.spyOn(consumer, 'sendPushNotifications');

    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'error',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      isRead: false,
    };

    jest.spyOn(prisma.notifications, 'createMany').mockRejectedValue('mock' as any);

    try {
      await consumer.sendPushNotifications({
        data: payload,
      } as unknown as Job<CreatePushNotificationDto>);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should get stage-wise notifications for the logged user', async () => {
    const response = await service.getLoggedUserNotifications(userId, {
      category: NOTICE_CATEGORY[NOTICE_CATEGORY_CODE.STAGE_WISE],
      pageNumber: 1,
      perPage: 10,
    });

    expect(Array.isArray(response.data)).toBeTruthy();
  });

  it('Mark notifications as read by user Endpoint (Bulk update)', async () => {
    const serviceSpy = jest.spyOn(service, 'sendBatchedNotifications');
    const consumerSpy = jest.spyOn(consumer, 'sendPushNotifications');

    const payload = {
      deviceTokenData: [{ userId: userId, token: 'deviceToken' }],
      title: 'title',
      body: 'body',
      notificationType: $Enums.NOTICE_TYPE.NOTIFICATION,
      isRead: false,
    };

    jest.spyOn(prisma.notifications, 'createMany').mockResolvedValue('mock' as any);

    // consumer dependencies firebase-admin & prisma are mocked
    consumer.sendPushNotifications({ data: payload } as unknown as Job<CreatePushNotificationDto>);

    await service.sendBatchedNotifications(payload);

    expect(serviceSpy).toHaveBeenCalledWith(payload);
    expect(consumerSpy).toHaveBeenCalledWith({ data: payload });

    const getAllPostedNotifications = await prisma.notifications.findMany({
      where: {
        title: {
          equals: 'title',
          mode: 'insensitive',
        },
      },
    });

    expect(Array.isArray(getAllPostedNotifications)).toBe(true);

    jest.spyOn(prisma.notifications, 'updateMany').mockResolvedValue('mock' as any);

    const notificationIds: string[] = getAllPostedNotifications.map(
      (notification) => notification.id,
    );

    const updateDto: UpdateNotificationReadStatusDto = {
      notificationIds: notificationIds,
    };

    const updatedData = await service.updateNotificationsReadStatus(userId, updateDto);

    expect(Array.isArray(updatedData.notificationIds)).toBe(true);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
