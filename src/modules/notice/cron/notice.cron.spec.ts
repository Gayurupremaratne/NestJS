import { QUEUES } from '@common/constants';
import { NOTICE_CATEGORY } from '@common/constants/notice_category.constants';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { OrderService } from '../../order/order.service';
import { PendingNoticeDto } from '../dto/pending-notice.dto';
import { NoticeRepository } from '../notice.repository';
import { NoticeService } from '../notice.service';
import { NoticeQueuePublisher } from '../queue/notice.publisher';
import { NoticeCronJob } from './notice.cron';
import { PushNotificationService } from '../../push-notification/push-notification.service';

describe('Notice Cron Job', () => {
  let cron: NoticeCronJob;
  let prisma: PrismaService;

  const mockQueue = {
    addBulk: jest.fn(),
  } as unknown as Queue;

  const mockUserRepo = {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockOrderService = {
    cancelOrdersByUserId: jest.fn(),
  };

  const mockNoticeRepo = {
    updateNoticeStatus: jest.fn(),
    getPendingNotices: jest.fn(() => {
      const pendingNotice: PendingNoticeDto[] = [
        {
          id: uuidv4(),
          type: 'EMAIL',
          category: NOTICE_CATEGORY[0],
          noticeTranslation: expect.any(Array),
        },
      ];
      return pendingNotice;
    }),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const mockNoticeService = {
    getNoticesWithUserData: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticeCronJob,
        { provide: getQueueToken(QUEUES.NOTICE), useValue: mockQueue },
        PrismaService,
        ConfigService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: OrderService, useValue: mockOrderService },
        { provide: NoticeRepository, useValue: mockNoticeRepo },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: NoticeService, useValue: mockNoticeService },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();
    prisma = module.get(PrismaService);
    cron = module.get<NoticeCronJob>(NoticeCronJob);
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  it('should execute cron job', async () => {
    const cronJobSpy = jest.spyOn(cron, 'cronJobNotice');

    await cron.cronJobNotice();

    expect(cronJobSpy).toHaveBeenCalled();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
