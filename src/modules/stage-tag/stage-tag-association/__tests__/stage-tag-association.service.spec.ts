import { PrismaService } from '@prisma-orm/prisma.service';
import { Test } from '@nestjs/testing';
import { StageTagAssociationService } from '../stage-tag-association.service';
import { StageService } from '../../../stage/stage.service';
import { StageTagAssociationRepository } from '../stage-tag-association.repository';
import { StageRepository } from '../../../stage/stage.repository';
import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
import { StageTagService } from '../../stage-tag.service';
import { StageTagDto } from '../../dto/stage-tag.dto';
import { StageTagRepository } from '../../stage-tag.repository';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagAssociationService', () => {
  let prisma: PrismaService;
  let stageTagService: StageTagService;
  let stageTagAssociationService: StageTagAssociationService;
  let stageService: StageService;
  let stageDto: StageDto;
  let stageTagDto: StageTagDto;

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
        StageTagAssociationService,
        StageService,
        StageTagService,
        StageTagAssociationRepository,
        StageTagRepository,
        StageRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageTagService = moduleRef.get(StageTagService);
    stageTagAssociationService = moduleRef.get(StageTagAssociationService);
    stageService = moduleRef.get(StageService);

    const stageResponseOne = await stageService.createStage(stageRequest);
    stageDto = stageResponseOne;

    const stageTagResponse = await stageTagService.createStageTag();
    stageTagDto = stageTagResponse;
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Update a stage tag association', () => {
    it('should update a stage tag association', async () => {
      const stageTagAssociationResponse =
        await stageTagAssociationService.updateStageTagAssociation(stageTagDto.id, {
          stageIds: [stageDto.id],
        });

      expect(Array.isArray(stageTagAssociationResponse)).toBeTruthy();
    });
  });

  describe('Get stage tag associations', () => {
    it('should get stage tag associations', async () => {
      const stageTagAssociationResponse = await stageTagAssociationService.getStageTagAssociation(
        stageTagDto.id,
        10,
        1,
      );

      expect(Array.isArray(stageTagAssociationResponse.data)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.stage.deleteMany({ where: { id: stageDto.id } });
    await prisma.stageTag.delete({ where: { id: stageTagDto.id } });
    await prisma.$disconnect();
  });
});
