import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { NOTICE_TYPE } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { Queue } from 'bull';
import { OrderService } from '../../order/order.service';
import { NoticeQueueDto } from '../dto/notice-queue.dto';
import { NoticeRepository } from '../notice.repository';
import { NoticeQueuePublisher } from './notice.publisher';

describe('Notice Publisher Service', () => {
  let publisher: NoticeQueuePublisher;
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
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation(() => {
      return 1;
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticeQueuePublisher,
        { provide: getQueueToken(QUEUES.NOTICE), useValue: mockQueue },
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: OrderService, useValue: mockOrderService },
        { provide: NoticeRepository, useValue: mockNoticeRepo },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
      ],
    }).compile();
    prisma = module.get(PrismaService);
    publisher = module.get<NoticeQueuePublisher>(NoticeQueuePublisher);
  });

  it('should be defined', () => {
    expect(publisher).toBeDefined();
  });

  it('should publish to notice queue', async () => {
    const cronJobSpy = jest.spyOn(publisher, 'publishToNoticeQueue');

    const payload: NoticeQueueDto[] = [
      {
        id: expect.any(String),
        type: NOTICE_TYPE.EMAIL,
        userId: 'dde9740e-9738-4b55-aa4e-88fe9b2fa5ad',
        category: 'dde9740e-9738-4b55-aa4e-88fe9b2fa5ad',
        noticeTranslation: [],
      },
    ];

    await publisher.publishToNoticeQueue(payload);

    expect(cronJobSpy).toHaveBeenCalled();
  });

  it('should throw error notice queue for invalid data', async () => {
    try {
      const payload: NoticeQueueDto[] = null;

      await publisher.publishToNoticeQueue(payload);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
