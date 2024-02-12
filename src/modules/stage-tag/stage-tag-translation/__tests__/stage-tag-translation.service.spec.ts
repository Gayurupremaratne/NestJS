import { PrismaService } from '@prisma-orm/prisma.service';
import { StageTagService } from '../../stage-tag.service';
import { StageTagTranslationService } from '../stage-tag-translation.service';
import { StageTagDto } from '../../dto/stage-tag.dto';
import { StageTagTranslationDto } from '../dto/stage-tag-translation.dto';
import { StageTagRepository } from '../../stage-tag.repository';
import { StageTagTranslationRepository } from '../stage-tag-translation.repository';
import { Test } from '@nestjs/testing';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagTranslationService', () => {
  let prisma: PrismaService;
  let stageTagService: StageTagService;
  let stageTagTranslationService: StageTagTranslationService;
  let createdStageTag: StageTagDto;
  let updatedStageTagTranslation: StageTagTranslationDto;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StageTagService,
        PrismaService,
        StageTagRepository,
        StageTagTranslationService,
        StageTagTranslationRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageTagService = moduleRef.get(StageTagService);
    stageTagTranslationService = moduleRef.get(StageTagTranslationService);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Update or add stage tag translation', () => {
    it('should update or add stage tag translation', async () => {
      const stageTagResponse = await stageTagService.createStageTag();
      createdStageTag = stageTagResponse;

      const expectedTranslation = {
        stageTagId: createdStageTag.id,
        localeId: 'en',
        name: 'Updated test tag',
      };
      updatedStageTagTranslation = await stageTagTranslationService.updateStageTagTranslation(
        createdStageTag.id,
        'en',
        { name: 'Updated test tag' },
      );
      delete updatedStageTagTranslation.id;
      delete updatedStageTagTranslation.createdAt;
      delete updatedStageTagTranslation.updatedAt;
      expect(updatedStageTagTranslation).toEqual(expectedTranslation);
    });
  });

  afterAll(async () => {
    await prisma.stageTag.delete({ where: { id: createdStageTag.id } });
    await prisma.$disconnect();
  });
});
