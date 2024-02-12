import {
  COMPLETION_STATUS,
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
  STATUS_CODE,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import {
  FAMILY_FRIENDLY_STATUS,
  PEOPLE_INTERACTIONS,
  Passes,
  REGISTRATION_STATUS,
} from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../../../modules/mail/mail.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { OrderDto } from '../../order/dto/order.dto';
import { OrderRepository } from '../../order/order.repository';
import { OrderService } from '../../order/order.service';
import { CreatePassInventoryDto } from '../../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { CreateStageDto } from '../../stage/dto/create-stage.dto';
import { StageDto } from '../../stage/dto/stage.dto';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserTrailTrackingService } from '../user-trail-tracking.service';
import { UserTrailTrackingSummaryService } from './user-trail-tracking-summary.service';

describe('UserTrailTrackingSummaryService', () => {
  let userTrailTrackingSummaryService: UserTrailTrackingSummaryService;
  let userTrailTrackingService: UserTrailTrackingService;
  let userService: UserService;
  let stageService: StageService;
  let ordersService: OrderService;
  const randUUID = uuidv4();
  let userDto: UserDto;
  let stageDto: StageDto;
  let orderDto: OrderDto;
  let passDto: Passes;
  let passInventoryService: PassInventoryService;
  let prisma: PrismaService;
  const passReservedDate = new Date().toISOString().split('T')[0];
  const trailStartDate = moment(passReservedDate + ' ' + '09:00:00').toDate();

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
      providers: [
        UserTrailTrackingSummaryService,
        UserTrailTrackingService,
        PrismaService,
        StageService,
        OrderService,
        OrderRepository,
        PassesService,
        StageRepository,
        UserService,
        UserRepository,
        StaticContentService,
        PassInventoryService,
        StaticContentRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: KeycloakService, useValue: mockKeycloakService },
      ],
    }).compile();

    userTrailTrackingSummaryService = module.get<UserTrailTrackingSummaryService>(
      UserTrailTrackingSummaryService,
    );
    userTrailTrackingService = module.get<UserTrailTrackingService>(UserTrailTrackingService);
    userService = module.get<UserService>(UserService);
    stageService = module.get<StageService>(StageService);
    ordersService = module.get<OrderService>(OrderService);
    passInventoryService = module.get<PassInventoryService>(PassInventoryService);
    prisma = module.get<PrismaService>(PrismaService);

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
  });

  it('should be defined', () => {
    expect(userTrailTrackingSummaryService).toBeDefined();
  });

  describe('Should get user tracking summary', () => {
    it('should get user tracking summary details', async () => {
      const responseDetails = [
        {
          totalCompletedStages: 0,
          totalDuration: userTrailUpdatePayload.totalTime,
          totalDistanceTraveled: userTrailUpdatePayload.distanceTraveled,
          totalStages: expect.anything(),
          totalAwardedBadges: 0,
        },
      ];

      const response = await userTrailTrackingSummaryService.getUserTrailTrackingSummary(
        reqUser.sub,
      );

      expect(response).toStrictEqual(responseDetails);
    });
  });

  describe('Should get user tracking summary of all stages', () => {
    it('Should get user tracking summary of all stages', async () => {
      const response = await userTrailTrackingSummaryService.getUserTrailTrackingOfAllStages(
        reqUser.sub,
        1,
      );

      expect(response.data[0].stageId).toStrictEqual(stageDto.id);
    });

    it('Should get user tracking summary of all stages by complete type', async () => {
      const response = await userTrailTrackingSummaryService.getUserTrailTrackingOfAllStages(
        reqUser.sub,
        1,
        10,
        COMPLETION_STATUS.COMPLETE,
      );

      expect(response.data).toStrictEqual([]);
    });

    it('Should get user tracking summary of all stages by incomplete type', async () => {
      const response = await userTrailTrackingSummaryService.getUserTrailTrackingOfAllStages(
        reqUser.sub,
        1,
        10,
        COMPLETION_STATUS.INCOMPLETE,
      );

      expect(response.data[0].stageId).toStrictEqual(stageDto.id);
    });

    it('Should get user tracking by passId', async () => {
      const response = await userTrailTrackingSummaryService.getUserTrailTrackingByPassId(
        passDto.id,
        reqUser.sub,
      );

      expect(response.passesId).toStrictEqual(passDto.id);
    });
  });

  describe('Should get user tracking completion summary of a stage', () => {
    it('Should get user tracking completion summary of a stage', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await userTrailTrackingSummaryService.getAllUsersTrailCompletionSummary({
        stageId: stageDto.id,
        month,
        year,
      });

      expect(response).toBeDefined();
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userDto.id } });
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.$disconnect();
  });
});
