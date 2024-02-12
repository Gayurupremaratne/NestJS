import { Test, TestingModule } from '@nestjs/testing';
import { PointOfInterestService } from './point-of-interest.service';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from '@config/app-config';
import { PrismaService } from '@prisma-orm/prisma.service';
import { StaticContentService } from '../static-content/static-content.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StageService } from '../stage/stage.service';
import {
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
} from '@common/constants';
import { CreateStageDto } from '../stage/dto/create-stage.dto';
import { v4 as uuidv4 } from 'uuid';
import { CreatePointOfInterestDto } from './dto/create-poi.dto';
import { StageRepository } from '../stage/stage.repository';
import { PaginatedResult } from '@common/helpers';
import { GetPoiDto } from './dto/get-poi.dto';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { INestApplication, InternalServerErrorException } from '@nestjs/common';

describe('PointOfInterestService', () => {
  let poiService: PointOfInterestService;
  let stageService: StageService;
  let prisma: PrismaService;
  let mockResponse;
  let createdAssetKey;
  let app: INestApplication;

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

  const mockPayload = {
    latitude: 30.82394,
    longitude: 90.32394,
    pointOfInterestTranslations: [
      {
        localeId: 'en',
        title: 'Test',
        description: 'test',
      },
    ],
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
        StageService,
        StageRepository,
        PointOfInterestService,
        PrismaService,
        StaticContentService,
        StaticContentRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    poiService = module.get<PointOfInterestService>(PointOfInterestService);
    stageService = module.get<StageService>(StageService);
    prisma = module.get<PrismaService>(PrismaService);

    const createStage = await stageService.createStage(stageToCreate);

    const fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: STATIC_CONTENT_PATHS.POI_MEDIA },
    });

    mockPayload['assetKey'] = createdAssetKey.fileKey;
    mockPayload['stageIds'] = [createStage.id];
  });

  it('should be defined', () => {
    expect(poiService).toBeDefined();
  });

  describe('Create Point Of Interest', () => {
    it('Should create new point of interest', async () => {
      const payload = { ...mockPayload };
      mockResponse = {
        id: expect.anything(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        mediaKey: payload['assetKey'],
        pointOfInterestTranslation: [
          {
            localeId: 'en',
            title: 'Test',
            description: 'test',
            pointOfInterestId: expect.anything(),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
        pointOfInterestStage: [
          {
            pointOfInterestId: expect.anything(),
            stageId: payload['stageIds'][0],
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
      };
      const response = await poiService.createPointOfInterest(payload as CreatePointOfInterestDto);
      mockResponse['id'] = response.id;
      expect(response).toBeDefined();
      expect(response).toHaveProperty('pointOfInterestStage');
      expect(response).toHaveProperty('pointOfInterestTranslation');
      expect(response).toHaveProperty('mediaKey');
    });

    it('Should fail to create new point of interest', async () => {
      const payload = { ...mockPayload, latitude: null };
      try {
        await poiService.createPointOfInterest(payload as CreatePointOfInterestDto);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Get Point Of Interest', () => {
    it('Should get point of interest by id', async () => {
      const response = await poiService.getPointOfInterestById(mockResponse.id);
      expect(response).toBeDefined();
      expect(response).toHaveProperty('pointOfInterestStage');
      expect(response).toHaveProperty('pointOfInterestTranslation');
      expect(response).toHaveProperty('mediaKey');
    });

    it('Should fail to get point of interest by id', async () => {
      try {
        await poiService.getPointOfInterestById(null);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('Should get all point of interest by stageId', async () => {
      const response = await poiService.getPointOfInterestByStageId(mockPayload['stageIds'][0]);

      expect(response[0].id).toBe(mockResponse.id);
    });

    it('Should fail to get all point of interest by stageId', async () => {
      try {
        await poiService.getPointOfInterestByStageId(null);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('Should get paginated point of interest by stageId', async () => {
      const response = await poiService.getPointOfInterestByStageId(mockPayload['stageIds'][0], {
        pageNumber: 1,
      });

      expect((response as PaginatedResult<GetPoiDto>).data[0].id).toBe(mockResponse.id);
    });

    it('Should get paginated point of interest by stageId', async () => {
      try {
        await poiService.getPointOfInterestByStageId(null, {
          pageNumber: 1,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('Should get all point of interest', async () => {
      const response = await poiService.getAllPointOfInterest({
        pageNumber: 1,
        perPage: 10,
        orderBy: [
          {
            field: 'title',
            sortBy: 'desc',
          },
        ],
      });

      expect((response as PaginatedResult<GetPoiDto>).data).toBeDefined();
    });

    it('Should get all point of interest with sorting by poi title', async () => {
      const response = await poiService.getAllPointOfInterest({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'title',
      });

      expect((response as PaginatedResult<GetPoiDto>).data).toBeDefined();
    });

    it('Should get random point of interest', async () => {
      const response = await poiService.getRandomPointsOfInterest();

      expect(response).toBeDefined();
    });
  });

  describe('Update Point Of Interest', () => {
    it('Should update point of interest', async () => {
      const payload = { ...mockPayload };
      payload.latitude = 54.9009;

      const updatedMockResponse = {
        updatedPoiTranslations: mockResponse.pointOfInterestTranslation,
        updatedPoi: {
          id: expect.anything(),
          latitude: payload.latitude,
          longitude: payload.longitude,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
          mediaKey: payload['assetKey'],
        },
      };

      const response = await poiService.updatePointOfInterest(
        mockResponse.id,
        payload as CreatePointOfInterestDto,
      );
      expect(response).toStrictEqual(updatedMockResponse);
    });

    it('Should fail to update point of interest', async () => {
      const payload = { ...mockPayload };
      payload.latitude = null;

      try {
        await poiService.updatePointOfInterest(
          mockResponse.id,
          payload as CreatePointOfInterestDto,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Update Point Of Interest with a new assests key', () => {
    it('Should update point of interest with a new assests key', async () => {
      const fileKey = uuidv4();
      const createdNewAssetKey = await prisma.assetKeys.create({
        data: { fileKey, module: STATIC_CONTENT_PATHS.POI_MEDIA },
      });

      mockPayload['assetKey'] = createdNewAssetKey.fileKey;
      const payload = { ...mockPayload };
      payload.latitude = 54.9009;
      payload['assetKey'] = createdNewAssetKey.fileKey;

      const updatedMockResponse = {
        updatedPoiTranslations: mockResponse.pointOfInterestTranslation,
        updatedPoi: {
          id: expect.anything(),
          latitude: payload.latitude,
          longitude: payload.longitude,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
          mediaKey: payload['assetKey'],
        },
      };

      const response = await poiService.updatePointOfInterest(
        mockResponse.id,
        payload as CreatePointOfInterestDto,
      );
      expect(response.updatedPoi.id).toStrictEqual(updatedMockResponse.updatedPoi.id);
    });
  });

  describe('Delete Point Of Interest', () => {
    it('Should delete point of interest', async () => {
      const response = await poiService.deletePointOfInterest(mockResponse.id);
      expect(response).toBe(undefined);
    });

    it('Should fail to delete', async () => {
      const mockResponse = { id: 'someId' }; // Define a mock response for the test
      try {
        await poiService.deletePointOfInterest(mockResponse.id);
      } catch (error) {
        // Ensure the error is an instance of InternalServerErrorException
        expect(error).toBeInstanceOf(InternalServerErrorException);
        // You can add further assertions on the error message or other properties if needed
      }
    });

    it('Should delete point of interest without media key', async () => {
      const payload = { ...mockPayload };

      const createStage = await stageService.createStage({ ...stageToCreate, number: 2 });

      const mockResponseNoMediaKey = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        assetKey: null,
        pointOfInterestTranslations: [
          {
            localeId: 'en',
            title: 'Test',
            description: 'test',
          },
        ],
        stageIds: [createStage.id],
      };

      const responseCreate = await poiService.createPointOfInterest(mockResponseNoMediaKey);
      // This test should not throw an error
      const response = await poiService.deletePointOfInterest(responseCreate.id);
      expect(response).toBe(undefined);
      await prisma.stage.delete({ where: { id: createStage.id } });
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: mockPayload['stageIds'][0] } });
    await prisma.$disconnect();
    await app.close();
  });
});
