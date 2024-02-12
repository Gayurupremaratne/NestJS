import {
  BADGE_TYPE_CODE,
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
  STATUS_CODE,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { BADGE_TYPES, FAMILY_FRIENDLY_STATUS, PEOPLE_INTERACTIONS, Passes } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { OrderDto } from '../order/dto/order.dto';
import { OrderRepository } from '../order/order.repository';
import { OrderService } from '../order/order.service';
import { CreatePassInventoryDto } from '../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { CreateStageDto } from '../stage/dto/create-stage.dto';
import { StageDto } from '../stage/dto/stage.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserTrailTrackingService } from './user-trail-tracking.service';

describe('UserTrailTrackingService', () => {
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

    await prisma.badge.create({
      data: {
        badgeKey: fileKey,
        type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
        stageId: stageDto.id,
      },
    });
  });

  it('should be defined', () => {
    expect(userTrailTrackingService).toBeDefined();
  });

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

  const userTrailUpdateResponse = {
    ...userTrailUpdatePayload,
    isActiveTrack: true,
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
  };

  describe('Should create or update user trail', () => {
    it('should create or update user trail tracking', async () => {
      userTrailUpdateResponse['userId'] = userDto.id;
      userTrailUpdateResponse['passesId'] = passDto.id;
      userTrailUpdateResponse['passes'] = {
        ...passDto,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        expiredAt: expect.anything(),
      };

      userTrailUpdatePayload.passesId = passDto.id;
      const response = await userTrailTrackingService.updateUserTrack(
        userTrailUpdatePayload,
        reqUser.sub,
      );

      expect(response).toStrictEqual(userTrailUpdateResponse);
    });

    it('it should throw error while updating track', async () => {
      try {
        await userTrailTrackingService.updateUserTrack(userTrailUpdatePayload, 'sdwe');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('should get current user trail track', async () => {
      const response = await userTrailTrackingService.getUserOngoingTrack(passDto.userId);

      const newStageDto = { ...stageDto, stagesTranslation: expect.anything() };

      const newPassDto = {
        ...passDto,
        stage: newStageDto,
        expiredAt: expect.anything(),
        updatedAt: expect.anything(),
      };

      const newResponse = { ...userTrailUpdateResponse, passes: newPassDto };

      expect(response).toStrictEqual(newResponse);
    });

    it('should throw error track data timestamp is expired', async () => {
      const newPayload = {
        ...userTrailUpdatePayload,
        timestamp: moment().add(1, 'd').toDate(),
      };

      userTrailUpdatePayload.passesId = passDto.id;
      try {
        await userTrailTrackingService.updateUserTrack(newPayload, reqUser.sub);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw error track startTime is not valid', async () => {
      const newPayload = {
        ...userTrailUpdatePayload,
        startTime: moment().add(1, 'd').toDate(),
      };

      userTrailUpdatePayload.passesId = passDto.id;
      try {
        await userTrailTrackingService.updateUserTrack(newPayload, reqUser.sub);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should create or update user trail tracking and assign stage badge when completion is 100%', async () => {
      userTrailUpdateResponse['userId'] = userDto.id;
      userTrailUpdateResponse['passesId'] = passDto.id;
      userTrailUpdateResponse['passes'] = {
        ...passDto,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        expiredAt: expect.anything(),
      };
      const newPayload = {
        ...userTrailUpdatePayload,
        completion: 100,
        isCompleted: true,
      };

      userTrailUpdatePayload.passesId = passDto.id;

      userTrailUpdateResponse.completion = 100;
      userTrailUpdateResponse.isCompleted = true;
      userTrailUpdateResponse.isActiveTrack = false;

      const response = await userTrailTrackingService.updateUserTrack(newPayload, reqUser.sub);

      expect(response).toStrictEqual(userTrailUpdateResponse);
    });

    it('it should not update & throw error when trail tracking is already completed', async () => {
      const newPayload = {
        ...userTrailUpdatePayload,
        completion: 100,
      };

      userTrailUpdatePayload.passesId = passDto.id;

      try {
        await userTrailTrackingService.updateUserTrack(newPayload, reqUser.sub);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('it should throw error when there is no ongoing trails for the user', async () => {
      try {
        await userTrailTrackingService.getUserOngoingTrack(reqUser.sub);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('it should throw error while fetching user ongoing track', async () => {
      try {
        await userTrailTrackingService.getUserOngoingTrack('wdwe');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userDto.id } });
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.$disconnect();
  });
});
