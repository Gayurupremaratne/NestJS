import {
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
} from '@common/constants';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import { PaginatedResult } from '@common/helpers';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { CreateStageDto } from '../stage/dto/create-stage.dto';
import { StageDatabaseDto } from '../stage/dto/stage-database.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { CreatePointOfInterestDto } from './dto/create-poi.dto';
import { GetPoiDto } from './dto/get-poi.dto';
import { PointOfInterestController } from './point-of-interest.controller';
import { PointOfInterestService } from './point-of-interest.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('PointOfInterestController', () => {
  let controller: PointOfInterestController;
  let stageService: StageService;
  let prisma: PrismaService;
  let mockResponse;
  let createdAssetKey;

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
      controllers: [PointOfInterestController],
      providers: [
        StageService,
        StageRepository,
        PointOfInterestService,
        PrismaService,
        StaticContentService,
        StaticContentRepository,
        UserService,
        UserRepository,
        PassesService,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    controller = module.get<PointOfInterestController>(PointOfInterestController);
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
    expect(controller).toBeDefined();
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
            stage: plainToInstance(StageDatabaseDto, stageToCreate),
          },
        ],
      };
      const response = await controller.createPointOfInterest(payload as CreatePointOfInterestDto);
      mockResponse['id'] = response.data.id;
      expect(response.data).toBeDefined();
    });
  });

  describe('Get Point Of Interest', () => {
    it('Should get point of interest by id', async () => {
      const response = await controller.getPointOfInterestById({ id: mockResponse.id });
      expect(response.data).toBeDefined();
    });

    it('Should get all point of interest by stageId', async () => {
      const response = await controller.getPointOfInterestByStageId({
        stageId: mockPayload['stageIds'][0],
      });

      expect(response.data[0].id).toBe(mockResponse.id);
    });

    it('Should get paginated point of interest by stageId', async () => {
      const response = await controller.getPointOfInterestByStageId(
        {
          stageId: mockPayload['stageIds'][0],
        },
        {
          pageNumber: 1,
          perPage: 10,
        },
      );

      expect((response.data as PaginatedResult<GetPoiDto>).data[0].id).toBe(mockResponse.id);
    });

    it('Should get all point of interest', async () => {
      const response = await controller.getAllPointOfInterest({
        pageNumber: 1,
        perPage: 10,
      });

      expect((response.data as PaginatedResult<GetPoiDto>).data[0].id).toBe(mockResponse.id);
    });

    it('Should get all point of interest with sorting', async () => {
      const response = await controller.getAllPointOfInterestEn({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'title',
      });

      expect((response.data as PaginatedResult<GetPoiDto>).data[0].id).toBe(mockResponse.id);
    });

    it('Should get 10 random point of interest', async () => {
      const response = await controller.getRandomPointOfInterest();
      expect(Array.isArray(response.data)).toBeTruthy();
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

      const response = await controller.updatePointOfInterest(
        { id: mockResponse.id },
        payload as CreatePointOfInterestDto,
      );
      expect(response.data).toStrictEqual(updatedMockResponse);
    });
  });

  describe('Delete Point Of Interest', () => {
    it('Should delete point of interest', async () => {
      const response = await controller.deletePointOfInterest({ id: mockResponse.id });
      expect(response.data).toBe(undefined);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: mockPayload['stageIds'][0] } });
    await prisma.$disconnect();
  });
});
