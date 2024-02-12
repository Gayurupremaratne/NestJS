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
import { CustomAuthRequest } from '@common/types';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Passes } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '../../common/mock-modules/auth.guard.mock';
import { PrismaService } from '../../prisma/prisma.service';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { OrderDto } from '../order/dto/order.dto';
import { OrderRepository } from '../order/order.repository';
import { OrderService } from '../order/order.service';
import { CreatePassInventoryDto } from '../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserTrailTrackingService } from '../user-trail-tracking/user-trail-tracking.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { GetStageDto } from './dto/get-stage-dto';
import { StageDto } from './dto/stage.dto';
import { StageTranslationController } from './stage-translation/stage-translation.controller';
import { StageTranslationRepository } from './stage-translation/stage-translation.repository';
import { StageTranslationService } from './stage-translation/stage-translation.service';
import { StageController } from './stage.controller';
import { StageRepository } from './stage.repository';
import { StageService } from './stage.service';

describe('StageController', () => {
  let app: INestApplication;
  let stageController: StageController;
  let stageService: StageService;
  let mockAbilitiesGuard: AbilitiesGuard;
  let createdStage: StageDto;
  let prisma: PrismaService;
  let userTrailTrackingService: UserTrailTrackingService;
  let userService: UserService;
  let ordersService: OrderService;
  let stageDto: StageDto;
  let userDto: UserDto;
  let orderDto: OrderDto;
  let passDto: Passes;
  let passInventoryService: PassInventoryService;
  const passReservedDate = new Date().toISOString().split('T')[0];
  const trailStartDate = moment(passReservedDate + ' ' + '09:00:00').toDate();
  const randUUID = uuidv4();
  let mockAuthGuard: AuthGuard;

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

  const reqUser = {
    sub: '',
  };

  const inventoryRequest: CreatePassInventoryDto = {
    date: new Date(passReservedDate),
    quantity: 30,
    stageId: '',
  };

  const orderRequest: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 1,
      children: 1,
    },
    reservedFor: new Date(passReservedDate),
  };

  const mockKeycloakService = {
    deleteUser: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const userTrailUpdatePayload = {
    passesId: '',
    averagePace: 3.5,
    averageSpeed: 1.2,
    distanceTraveled: 18,
    elevationGain: 0.9,
    elevationLoss: 10,
    latitude: 30.82394,
    longitude: 90.32394,
    totalTime: 3670,
    startTime: trailStartDate,
    completion: 10,
    timestamp: trailStartDate,
    isCompleted: false,
  };

  const stageRequest = {
    distance: 10,
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
  };

  const mockRequest = {
    user: {
      sub: uuidv4(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [StageController, StageTranslationController],
      providers: [
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        StageService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        UserTrailTrackingService,
        OrderService,
        OrderRepository,
        PassesService,
        UserService,
        UserRepository,
        StaticContentService,
        PassInventoryService,
        ConfigService,
        StaticContentRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: KeycloakService, useValue: mockKeycloakService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageController = module.get<StageController>(StageController);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    prisma = module.get(PrismaService);
    stageService = module.get<StageService>(StageService);
    userTrailTrackingService = module.get<UserTrailTrackingService>(UserTrailTrackingService);
    userService = module.get<UserService>(UserService);
    ordersService = module.get<OrderService>(OrderService);
    passInventoryService = module.get<PassInventoryService>(PassInventoryService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(stageController).toBeDefined();
  });

  describe('Create stage', () => {
    it('should create a stage', async () => {
      const response = await request(app.getHttpServer()).post('/stages').send(stageRequest);
      createdStage = Object.assign({}, response.body.data);

      const expected = {
        distance: 10,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        openTime: createdStage.openTime,
        closeTime: createdStage.closeTime,
        elevationGain: 100,
        open: false,
        number: 1,
        cumulativeReviews: 0,
        reviewsCount: 0,
        difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
        peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
        familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
      };

      const transformed = response.body.data as StageDto;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      delete transformed.kmlFileKey;
      delete transformed.startPoint;
      delete transformed.endPoint;
      delete transformed.mainImageKey;
      delete transformed.elevationImageKey;
      delete transformed.maximumAltitude;
      expect(response.status).toBe(201);
      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Get all stages with sorting popular', () => {
    it('should return stage', async () => {
      const getStageDto: GetStageDto = {
        sort: 'popular',
        difficulty: 'BEGINNER',
        tagIds:
          '3f009285-8ed6-437b-a540-89c2207ccbc3,91953be0-7445-46fd-a4ca-90f052beafc9,9fccce23-61d6-4fa6-b92f-7122586c6686',
        distanceRanges: '5-10,10.1-15,15.1',
        perPage: 10,
        pageNumber: 1,
      };
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        getStageDto,
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Get all stages with sorting stage', () => {
    it('should return stage', async () => {
      const getStageDto: GetStageDto = {
        sort: 'stage',
        difficulty: 'BEGINNER',
        distanceRanges: '5-10,10.1-15,15.1',
        familyFriendly: 'YES',
        peopleInteraction: 'LOW',
        perPage: 10,
        pageNumber: 1,
      };
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        getStageDto,
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Get all stages with ASC & DESC sorting', () => {
    const getStageDto: GetStageDto = {
      sort: 'number',
      status: 'open',
      perPage: 10,
      pageNumber: 1,
    };

    it('should return stages for number by ASC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        getStageDto,
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for number by DESC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: '-number' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for difficultyType by ASC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: 'difficultyType' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for difficultyType by DESC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: '-difficultyType' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for distance by ASC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: 'distance' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for distance by DESC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: '-distance' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for status by ASC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: 'status' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should return stages for status by DESC', async () => {
      const response = await stageController.getAllStages(
        mockRequest as unknown as CustomAuthRequest,
        { ...getStageDto, sort: '-status' },
      );
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Get top 10 popular stages', () => {
    it('should return stage', async () => {
      const response = await stageController.getTopPopularStages(
        mockRequest as unknown as CustomAuthRequest,
      );
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Get stage', () => {
    it('should get stage', async () => {
      const response = await stageController.getStage(
        { id: createdStage.id },
        mockRequest as unknown as CustomAuthRequest,
      );

      const transformed = Object.assign({}, response.data);

      const expected = {
        distance: 10,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        openTime: transformed.openTime,
        closeTime: transformed.closeTime,
        elevationGain: 100,
        open: false,
        number: 1,
        cumulativeReviews: 0,
        reviewsCount: 0,
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
        difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
        peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
        familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
      };

      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      delete transformed.kmlFileKey;
      delete transformed.startPoint;
      delete transformed.endPoint;
      delete transformed.mainImageKey;
      delete transformed.elevationImageKey;
      delete transformed.maximumAltitude;

      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Update stage', () => {
    it('should update a stage', async () => {
      const mockStage = {
        id: createdStage.id,
        distance: 10,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        openTime: '08:00:00',
        closeTime: '17:00:00',
        elevationGain: 100,
        open: true,
        number: 1,
        difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
        peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
        familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
        kmlFileKey: '',
        startPoint: [],
        endPoint: [],
      };

      jest.spyOn(prisma.stage, 'findFirst').mockResolvedValue(mockStage as any);
      const response = await stageController.updateStage({ id: mockStage.id }, mockStage);
      const stageResponseData = response.data;

      const expected = {
        id: createdStage.id,
        distance: 10,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        openTime: stageResponseData.openTime,
        closeTime: stageResponseData.closeTime,
        elevationGain: 100,
        open: true,
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
      delete stageResponseData.createdAt;
      delete stageResponseData.updatedAt;
      delete stageResponseData.mainImageKey;
      delete stageResponseData.elevationImageKey;
      delete stageResponseData.maximumAltitude;

      expect(stageResponseData).toEqual(expect.objectContaining(expected));
    });
  });

  describe('Get users of a stage', () => {
    it('should get users of a stage', async () => {
      const stageToCreate: CreateStageDto = {
        distance: 1,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        number: 2,
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

      const userResponse = await userService.createUser(userRequest);

      userDto = userResponse;
      reqUser.sub = userDto.id;

      stageDto = await stageService.createStage(stageToCreate);

      inventoryRequest.stageId = stageDto.id;
      orderRequest.stageId = stageDto.id;

      await passInventoryService.create(inventoryRequest);

      orderDto = await ordersService.createOrder(orderRequest, userDto.id);

      const fileKey = uuidv4();
      await prisma.assetKeys.create({
        data: { fileKey, module: STATIC_CONTENT_PATHS.BADGE_MEDIA },
      });

      passDto = await prisma.passes.findFirst({
        where: {
          orderId: orderDto.id,
          userId: userDto.id,
          activated: true,
        },
      });

      userTrailUpdatePayload.passesId = passDto.id;
      await userTrailTrackingService.updateUserTrack(userTrailUpdatePayload, reqUser.sub);

      const response = await stageController.getActivatedUsersByStage(
        { id: createdStage.id },
        {
          field: 'firstName',
          value: 'test',
          reservedFor: passReservedDate,
          perPage: 10,
          pageNumber: 1,
        },
      );

      expect(Array.isArray(response.data.data)).toBeTruthy();
    });
  });

  describe('Delete stage', () => {
    it('should delete stage', async () => {
      const response = await stageController.deleteStage({ id: createdStage.id });
      expect(response.data).toStrictEqual(createdStage.id);
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userDto.id } });
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
