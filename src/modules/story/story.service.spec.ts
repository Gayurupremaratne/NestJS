import {
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
  STATUS_CODE,
} from '@common/constants';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import { AppConfig } from '@config/index';
import { HttpException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { CreateStageDto } from '../stage/dto/create-stage.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentService } from '../static-content/static-content.service';
import { StoryService } from './story.service';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StoryService', () => {
  let storyService: StoryService;
  let stageService: StageService;
  let userService: UserService;
  let prisma: PrismaService;
  const randUUID = uuidv4();
  let createdAssetKey;
  let mockGetStoryResponse;
  let createStageId: string;

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

  const userRequest: CreateUserDto = {
    id: randUUID,
    firstName: 'test',
    lastName: 'test',
    email: `test${randUUID}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.COMPLETE],
  };

  const mockKeycloakService = {
    deleteUser: jest.fn(),
  };

  const mockPayload = {
    latitude: 30.82394,
    longitude: 90.32394,
    stageStoryTranslations: [
      {
        localeId: 'en',
        title: 'Test Title',
        audioKey: createdAssetKey?.id,
        description: 'Test',
        createdAt: '2023-08-14T00:03:46.396Z',
        updatedAt: '2023-08-14T00:03:46.396Z',
      },
    ],
    stageId: stageToCreate['id'],
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        StoryService,
        PrismaService,
        StageService,
        StageRepository,
        UserService,
        PassesService,
        UserRepository,
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    storyService = module.get<StoryService>(StoryService);
    stageService = module.get<StageService>(StageService);
    userService = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);

    const createStage = await stageService.createStage(stageToCreate);
    createStageId = createStage.id;

    const fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: STATIC_CONTENT_PATHS.STORY_MEDIA },
    });

    mockPayload.stageStoryTranslations[0].audioKey = createdAssetKey.fileKey;
    mockPayload.stageId = createStage.id;
  });

  it('should be defined', () => {
    expect(storyService).toBeDefined();
  });

  describe('Create Story', () => {
    it('should create new story', async () => {
      const payload = { ...mockPayload };

      mockGetStoryResponse = {
        id: expect.anything(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        stageId: payload.stageId,
        stageStoryTranslations: [
          {
            localeId: 'en',
            title: 'Test Title',
            audioKey: payload.stageStoryTranslations[0].audioKey,
            description: 'Test',
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
            stageStoryId: expect.anything(),
          },
        ],
      };

      const response = await storyService.createStory(payload);
      mockGetStoryResponse['id'] = response.id;
      delete response['stage'];
      expect(response).toStrictEqual(mockGetStoryResponse);
    });

    it('should fails create new story', async () => {
      try {
        await storyService.createStory(null);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe('Get Story', () => {
    it('should get story by id', async () => {
      const response = await storyService.getStory(mockGetStoryResponse['id']);
      delete response['stage'];
      expect(response).toStrictEqual(mockGetStoryResponse);
    });

    it('should fail to get story by id', async () => {
      try {
        await storyService.getStory(null);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('should get story by stageId', async () => {
      const response = await storyService.getStoryByStage(mockPayload.stageId);
      expect(response[0].stageId).toBe(mockPayload.stageId);
    });

    it('should fail to get story by stageId', async () => {
      try {
        await storyService.getStoryByStage(null);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('should throw error when fetching story by stageId', async () => {
      try {
        await storyService.getStoryByStage('1243');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('should get all story', async () => {
      const paginatedMetaResult = {
        total: expect.anything(),
        lastPage: expect.anything(),
        currentPage: 1,
        perPage: 10,
      };
      const response = await storyService.getAllStory({
        pageNumber: 1,
        orderBy: [
          {
            field: 'title',
            sortBy: 'asc',
          },

          {
            field: 'number',
            sortBy: 'asc',
          },
        ],
      });
      delete response.meta.prev;
      delete response.meta.next;
      expect(response.meta).toEqual(paginatedMetaResult);
    });
  });

  describe('Update Story', () => {
    it('should update story', async () => {
      mockPayload.latitude = 54.9009;
      const fileKey = uuidv4();
      const newAssetKey = await prisma.assetKeys.create({
        data: { fileKey, module: STATIC_CONTENT_PATHS.STORY_MEDIA },
      });

      const updatedPayload = { ...mockPayload };

      updatedPayload.stageId = null;

      updatedPayload.stageStoryTranslations = [
        {
          localeId: 'fr',
          title: 'Test Title French',
          audioKey: newAssetKey?.fileKey,
          description: 'Test 2',
          createdAt: '2023-08-14T00:03:46.396Z',
          updatedAt: '2023-08-14T00:03:46.396Z',
        },
      ];

      const response = await storyService.updateStory(mockGetStoryResponse['id'], updatedPayload);
      expect(response.updatedStory.latitude).toStrictEqual(mockPayload.latitude);
    });

    it('should fail to update story', async () => {
      try {
        await storyService.updateStory(null, null);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Create or update story consumption', () => {
    it('should upsert story consumption', async () => {
      const mockResponse = {
        stageStoryId: mockGetStoryResponse['id'],
        userId: randUUID,
        status: 'UNPLAYED',
        timestamp: null,
      };

      const user = await userService.createUser(userRequest);

      const response = await storyService.upsertStoryConsumption(
        mockGetStoryResponse['id'],
        user.id,
        {
          status: 'UNPLAYED',
        },
      );
      expect(response).toStrictEqual(mockResponse);
    });

    it('should fail to upsert story consumption', async () => {
      try {
        await storyService.upsertStoryConsumption(null, null, {
          status: 'UNPLAYED',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Delete Story', () => {
    it('should delete story', async () => {
      const response = await storyService.deleteStory(mockGetStoryResponse['id']);
      expect(response).toBe(undefined);
    });

    it('should fails to delete story', async () => {
      try {
        await storyService.deleteStory(null);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: userRequest.email } });
    await prisma.stage.delete({ where: { id: createStageId } });
    await prisma.$disconnect();
  });
});
