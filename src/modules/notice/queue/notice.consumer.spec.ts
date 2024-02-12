import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { $Enums } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { Job, Queue } from 'bull';
import { OrderService } from '../../order/order.service';
import { NoticeQueueDto } from '../dto/notice-queue.dto';
import { NoticeRepository } from '../notice.repository';
import { NoticeService } from '../notice.service';
import { NoticeQueueConsumer } from './notice.consumer';

describe('Notice Consumer Service', () => {
  let consumer: NoticeQueueConsumer;
  let prisma: PrismaService;
  let service: NoticeService;

  const mockUserRepo = {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockOrderService = {
    cancelOrdersByUserId: jest.fn(),
  };

  const mockNoticeRepo = {
    updateNoticeStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation(() => {
      return 1;
    }),
  };

  const mockNoticeService = {
    sendNoticeToMailQueue: jest.fn(),
    sendNoticeToNotificationQueue: jest.fn(),
  };

  const mockQueue = {
    addBulk: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticeQueueConsumer,
        PrismaService,
        { provide: getQueueToken(QUEUES.NOTICE), useValue: mockQueue },
        { provide: NoticeService, useValue: mockNoticeService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: OrderService, useValue: mockOrderService },
        { provide: NoticeRepository, useValue: mockNoticeRepo },
      ],
    }).compile();
    prisma = module.get(PrismaService);
    consumer = module.get<NoticeQueueConsumer>(NoticeQueueConsumer);
    service = module.get<NoticeService>(NoticeService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('should publish to email notice queue', async () => {
    const consumerSpy = jest.spyOn(consumer, 'noticeMailConsumer');

    const payload: NoticeQueueDto = {
      id: '352fe2d3-187c-4a29-80af-32618b75a16a',
      noticeTranslation: [
        {
          title: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          localeId: 'en',
          noticeId: '352fe2d3-187c-4a29-80af-32618b75a16a',
        },
      ],
      type: $Enums.NOTICE_TYPE.EMAIL,
      userId: '352fe2d3-187c-4a29-80af-32618b75a16a',
    };
    await consumer.noticeMailConsumer({ data: payload } as unknown as Job<NoticeQueueDto>);

    expect(consumerSpy).toHaveBeenCalled();
  });

  it('should publish to notification notice queue', async () => {
    const consumerSpy = jest.spyOn(consumer, 'noticeNotificationConsumer');

    const payload: NoticeQueueDto = {
      id: '352fe2d3-187c-4a29-80af-32618b75a16a',
      noticeTranslation: [
        {
          title: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          localeId: 'en',
          noticeId: '352fe2d3-187c-4a29-80af-32618b75a16a',
        },
      ],
      type: $Enums.NOTICE_TYPE.EMAIL,
      userId: '352fe2d3-187c-4a29-80af-32618b75a16a',
    };
    await consumer.noticeNotificationConsumer({
      data: payload,
    } as unknown as Job<NoticeQueueDto>);

    expect(consumerSpy).toHaveBeenCalled();
  });

  it('should fail to publish to notification notice queue', async () => {
    jest.spyOn(service, 'sendNoticeToNotificationQueue').mockRejectedValueOnce('error');

    try {
      await consumer.noticeNotificationConsumer({
        data: undefined,
      } as unknown as Job<NoticeQueueDto>);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should fail to publish to email notice queue', async () => {
    jest.spyOn(service, 'sendNoticeToMailQueue').mockRejectedValueOnce('error');

    try {
      await consumer.noticeMailConsumer({
        data: undefined,
      } as unknown as Job<NoticeQueueDto>);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
