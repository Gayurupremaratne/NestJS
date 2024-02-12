import { PrismaService } from '@prisma-orm/prisma.service';
import { Test } from '@nestjs/testing';
import { RegionService } from '../region.service';
import { RegionRepository } from '../region.repository';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('RegionService', () => {
  let prisma: PrismaService;
  let regionService: RegionService;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        RegionService,
        RegionRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    regionService = moduleRef.get(RegionService);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Get all regions', () => {
    it('should get all regions', async () => {
      const regionResponse = await regionService.getAllRegions();

      expect(Array.isArray(regionResponse)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
