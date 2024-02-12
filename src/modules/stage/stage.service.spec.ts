import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StageService } from './stage.service';
import { StageDto } from './dto/stage.dto';
import { StageRepository } from './stage.repository';
import { StageTranslationService } from './stage-translation/stage-translation.service';
import { StageTranslationRepository } from './stage-translation/stage-translation.repository';
import { CreateStageDto } from './dto/create-stage.dto';
import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { MailService } from '../mail/mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';
describe('StageService', () => {
  let prisma: PrismaService;
  let stageService: StageService;
  let createdStage: StageDto;
  let expectedStage: StageDto;
  let stageIdToDelete: string;

  const stageToCreate: CreateStageDto = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: 1,
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

  expectedStage = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    number: 2,
    open: false,
    cumulativeReviews: 0,
    reviewsCount: 0,
    tags: null,
    stageMedia: [null],
    translations: [],
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    isFavorite: false,
    regions: null,
    kmlFileKey: null,
    startPoint: null,
    endPoint: null,
    mainImageKey: null,
    elevationImageKey: null,
    maximumAltitude: null,
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        StageService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        ConfigService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageService = moduleRef.get(StageService);

    const response = await stageService.createStage(stageToCreate);
    createdStage = Object.assign({}, response);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create stage', () => {
    it('should create stage', async () => {
      const response = await stageService.createStage({ ...stageToCreate, number: 2 });
      const transformedStage = Object.assign({}, response);
      stageIdToDelete = transformedStage.id;
      expectedStage.openTime = transformedStage.openTime;
      expectedStage.closeTime = transformedStage.closeTime;
      delete transformedStage.id;
      delete transformedStage.createdAt;
      delete transformedStage.updatedAt;
      delete transformedStage.kmlFileKey;
      delete expectedStage.tags;
      delete transformedStage.startPoint;
      delete transformedStage.endPoint;
      delete expectedStage.stageMedia;
      delete expectedStage.translations;
      delete expectedStage.regions;
      delete expectedStage.isFavorite;
      delete expectedStage.startPoint;
      delete expectedStage.endPoint;
      delete expectedStage.kmlFileKey;
      delete expectedStage.mainImageKey;
      delete expectedStage.elevationImageKey;
      expect(transformedStage).toEqual(expectedStage);
    });

    it('should throw error while creating a stage', async () => {
      const invalidStage: CreateStageDto = {
        ...stageToCreate,
        number: 3,
        openTime: 'Invalid time',
      };
      async function asyncFunctionThatThrowsError() {
        await stageService.createStage(invalidStage);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw error while creating a stage with a not unique stage number', async () => {
      async function asyncFunctionThatThrowsError() {
        await stageService.createStage(stageToCreate);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(BadRequestException);
    });
  });

  describe('Get stage', () => {
    it('should get stage', async () => {
      const retrievedStage = await stageService.getStage(createdStage.id);
      const transformedStage = retrievedStage;
      delete transformedStage.id;
      delete transformedStage.createdAt;
      delete transformedStage.updatedAt;
      delete transformedStage.kmlFileKey;
      delete transformedStage.startPoint;
      delete transformedStage.endPoint;
      delete transformedStage.mainImageKey;
      delete transformedStage.elevationImageKey;
      delete expectedStage.tags;
      expect(transformedStage).toEqual({
        ...expectedStage,
        number: 1,
        openTime: transformedStage.openTime,
        closeTime: transformedStage.closeTime,
        starCount: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0,
        },
        tags: null,
        stageMedia: null,
        translations: null,
        isFavorite: false,
        regions: null,
      });
    });

    it('should throw if the stage is not found', async () => {
      async function asyncFunctionThatThrowsError() {
        await stageService.getStage('ca2ca7a5-5297-4b4b-a8ce-7f7627f4fece');
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update stage', () => {
    it('should update stage', async () => {
      const updateStageDto = {
        ...createdStage,
        open: true,
      };

      expectedStage = {
        ...expectedStage,
        open: true,
      };
      const updatedStage = await stageService.updateStage(createdStage.id, updateStageDto);
      const transformedStage = updatedStage;
      expectedStage.openTime = transformedStage.openTime;
      expectedStage.closeTime = transformedStage.closeTime;
      delete transformedStage.id;
      delete transformedStage.createdAt;
      delete transformedStage.updatedAt;
      delete transformedStage.kmlFileKey;
      delete transformedStage.startPoint;
      delete transformedStage.endPoint;
      delete transformedStage.mainImageKey;
      delete transformedStage.elevationImageKey;
      expect(transformedStage).toEqual({ ...expectedStage, number: 1 });
    });

    it('should throw error while updating a stage', async () => {
      const updateStageDto = {
        ...createdStage,
        number: 4,
        openTime: 'Invalid time',
      };
      async function asyncFunctionThatThrowsError() {
        await stageService.createStage(updateStageDto);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Delete stage', () => {
    it('should delete stage', async () => {
      const retrievedStage = await stageService.deleteStage(createdStage.id);
      expect(retrievedStage).toEqual(createdStage.id);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageIdToDelete } });
    await prisma.$disconnect();
  });
});
