import { TestingModule, Test } from '@nestjs/testing';
import { StaticContentRepository } from '../static-content.repository';
import { StaticContentService } from '../static-content.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StaticContentRepository', () => {
  let repository: StaticContentRepository;
  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        StaticContentService,
        PrismaService,
        ConfigService,
        StaticContentRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    repository = module.get<StaticContentRepository>(StaticContentRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
