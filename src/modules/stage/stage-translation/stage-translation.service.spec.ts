import { PrismaService } from '@prisma-orm/prisma.service';
import { StageService } from '../stage.service';
import { StageTranslationService } from './stage-translation.service';
import { StageDto } from '../dto/stage.dto';
import { CreateStageDto } from '../dto/create-stage.dto';
import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
import { Test } from '@nestjs/testing';
import { StageRepository } from '../stage.repository';
import { StageTranslationRepository } from './stage-translation.repository';
import { UpdateStageTranslationDto } from './dto/update-stage-translation.dto';
import { StageTranslationDto } from './dto/stage-translation.dto';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';

import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTranslationService', () => {
  let prisma: PrismaService;
  let stageService: StageService;
  let stageTranslationService: StageTranslationService;
  let createdStage: StageDto;

  const stageRequest: CreateStageDto = {
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
        StageService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageService = moduleRef.get(StageService);
    stageTranslationService = moduleRef.get(StageTranslationService);

    const response = await stageService.createStage(stageRequest);
    createdStage = Object.assign({}, response);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Update or add stage translation', () => {
    it('should update or add stage translation', async () => {
      const stageTranslationRequest: UpdateStageTranslationDto = {
        stageId: createdStage.id,
        localeId: 'de',
        stageHead: 'Kandy',
        stageTail: 'Ella',
        description: 'Dies ist die Wegbeschreibung',
      };

      const expected: StageTranslationDto = {
        stageId: createdStage.id,
        localeId: 'de',
        stageHead: 'Kandy',
        stageTail: 'Ella',
        description: 'Dies ist die Wegbeschreibung',
      };
      const updatedStage =
        await stageTranslationService.updateStageTranslation(stageTranslationRequest);
      const transformedStage = updatedStage;
      delete transformedStage.id;
      delete transformedStage.createdAt;
      delete transformedStage.updatedAt;
      expect(transformedStage).toEqual(expected);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.$disconnect();
  });
});
