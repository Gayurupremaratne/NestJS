import { PrismaService } from '@prisma-orm/prisma.service';
import { Test } from '@nestjs/testing';
import { StageService } from '../../stage.service';
import { StageRepository } from '../../stage.repository';
import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
import { StageRegionService } from '../stage-region.service';
import { StageRegionRepository } from '../stage-region.repository';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';

import { Queue } from 'bull';

describe('StageRegionService', () => {
  let prisma: PrismaService;
  let stageRegionService: StageRegionService;
  let stageService: StageService;
  let stageDtoOne: StageDto;
  let stageDtoTwo: StageDto;

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    number: 1,
    cumulativeReviews: 0,
    reviewsCount: 0,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

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
        StageRegionService,
        StageService,
        StageRegionRepository,
        StageRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageRegionService = moduleRef.get(StageRegionService);
    stageService = moduleRef.get(StageService);

    const stageResponseOne = await stageService.createStage(stageRequest);
    stageDtoOne = stageResponseOne;

    const stageResponseTwo = await stageService.createStage({ ...stageRequest, number: 2 });
    stageDtoTwo = stageResponseTwo;
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Add a stage region', () => {
    it('should add a stage region', async () => {
      const stageRegionResponse = await stageRegionService.createStageRegion(stageDtoOne.id, {
        regionIds: [1, 2],
      });

      expect(Array.isArray(stageRegionResponse)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageDtoOne.id } });
    await prisma.stage.delete({ where: { id: stageDtoTwo.id } });
    await prisma.$disconnect();
  });
});
