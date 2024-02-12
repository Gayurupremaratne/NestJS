import {
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATUS_CODE,
} from '@common/constants';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { CustomAuthRequest } from '@common/types';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../common/mock-modules/abilities.guard.mock';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { NoticeRepository } from '../notice/notice.repository';
import { NoticeService } from '../notice/notice.service';
import { OrderRepository } from '../order/order.repository';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { StageDto } from '../stage/dto/stage.dto';
import { StageController } from '../stage/stage.controller';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserFavouriteStagesController } from './user-favourite-stages.controller';
import { UserFavouriteStagesService } from './user-favourite-stages.service';
import { NoticeQueuePublisher } from '../notice/queue/notice.publisher';
import { PushNotificationService } from '../push-notification/push-notification.service';

describe('UserFavouriteStagesController', () => {
  let userFavouriteStagesController: UserFavouriteStagesController;
  let app: INestApplication;
  let createdUser: UserDto;
  let createdStage: StageDto;
  let mockAbilitiesGuard: AbilitiesGuard;
  let prisma: PrismaService;
  const randUUID = uuidv4();
  let userService: UserService;
  let mockAuthGuard: AuthGuard;

  const userRequest = {
    id: uuidv4(),
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
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const stageRequest = {
    id: uuidv4(),
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
  };

  const mockRequest = {
    user: {
      sub: userRequest.id,
    },
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
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

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [UserFavouriteStagesController, StageController],
      providers: [
        UserFavouriteStagesService,
        UserService,
        PrismaService,
        UserRepository,
        StageRepository,
        StageService,
        PassesService,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        NoticeService,
        NoticeRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        StaticContentRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userFavouriteStagesController = module.get<UserFavouriteStagesController>(
      UserFavouriteStagesController,
    );
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    userService = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);

    const responseCreateUser = await userService.createUser(userRequest);

    createdUser = Object.assign({}, responseCreateUser);

    const responseCreateStage = await request(app.getHttpServer())
      .post('/stages')
      .send(stageRequest);

    createdStage = Object.assign({}, responseCreateStage.body.data);
  });

  it('should be defined', () => {
    expect(userFavouriteStagesController).toBeDefined();
  });

  describe('Get logged user favourite stages', () => {
    it('should get logged user favourite stages', async () => {
      const response = await userFavouriteStagesController.getFavoriteStagesOfLoggedUser(
        { pageNumber: 1, perPage: 10 },
        mockRequest as unknown as CustomAuthRequest,
      );

      expect(Array.isArray((await response.data).data)).toBeTruthy();
    });
  });

  describe('Create user favourite stage', () => {
    it('should create a user favourite stage', async () => {
      const response = await userFavouriteStagesController.createFavouriteStage(
        mockRequest as unknown as CustomAuthRequest,
        { stageId: stageRequest.id },
      );

      const expected = {
        userId: createdUser.id,
        stageId: createdStage.id,
      };

      expect(response).toStrictEqual(expected);
    });
  });

  describe('Delete user favourite stage', () => {
    it('should delete user favourite stage', async () => {
      const response = await userFavouriteStagesController.deleteFavouriteStage(
        mockRequest as unknown as CustomAuthRequest,
        { stageId: stageRequest.id },
      );

      const expected = {
        userId: createdUser.id,
        stageId: createdStage.id,
      };

      expect(response).toStrictEqual(expected);
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: userRequest.email } });
    await prisma.stage.delete({ where: { id: stageRequest.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
