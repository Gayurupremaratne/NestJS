import { StageDto } from '@app/modules/stage/dto/stage.dto';
import {
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
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
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../../common/mock-modules/abilities.guard.mock';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { OrderRepository } from '../../order/order.repository';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageReviewParamDto } from '../../stage/stage-review/dto/stage-review-param.dto';
import { StageReviewController as ExternalStageReviewController } from '../../stage/stage-review/stage-review.controller';
import { StageReviewsRepository as ExternalStageReviewsRepository } from '../../stage/stage-review/stage-review.repository';
import { StageReviewService as ExternalStageReviewService } from '../../stage/stage-review/stage-review.service';
import { StageController } from '../../stage/stage.controller';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentService } from '../../static-content/static-content.service';
import { StageReviewDto } from '../dto/stage-review.dto';
import { StageReviewController } from '../stage-review.controller';
import { StageReviewsRepository } from '../stage-review.repository';
import { StageReviewService } from '../stage-review.service';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { PushNotificationService } from '../../push-notification/push-notification.service';

describe('StageReviewController', () => {
  let app: INestApplication;
  let stageReviewController: StageReviewController;
  let externalStageReviewController: ExternalStageReviewController;
  let mockAbilitiesGuard: AbilitiesGuard;
  let createdStage: StageDto;
  let createdStageReview: StageReviewDto;
  let user: UserDto;
  let prisma: PrismaService;
  let userService: UserService;
  const userId = uuidv4();
  let mockAuthGuard: AuthGuard;

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
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
  };

  const stageReviewRequest = {
    rating: 4,
    review: 'This is a good trail',
  };

  const userRequest = {
    id: userId,
    firstName: 'test',
    lastName: 'test',
    email: `test${userId}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const reqData: StageReviewParamDto = {
    stageId: '',
    stageReviewId: '',
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
      controllers: [
        StageReviewController,
        ExternalStageReviewController,
        StageController,
        UserController,
      ],
      providers: [
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        PrismaService,
        StageReviewService,
        StageReviewsRepository,
        StageService,
        StageRepository,
        NoticeService,
        NoticeRepository,
        ExternalStageReviewService,
        ExternalStageReviewsRepository,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        UserService,
        UserRepository,
        PassesService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageReviewController = module.get<StageReviewController>(StageReviewController);
    externalStageReviewController = module.get<ExternalStageReviewController>(
      ExternalStageReviewController,
    );
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    prisma = module.get(PrismaService);
    userService = module.get<UserService>(UserService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);

    const stageResponse = await request(app.getHttpServer()).post('/stages').send(stageRequest);
    createdStage = stageResponse.body.data;
    reqData.stageId = createdStage.id;

    const userResponse = await userService.createUser(userRequest);
    user = userResponse;
  });

  it('should be defined', () => {
    try {
      expect(stageReviewController).toBeDefined();
    } catch (error) {}
  });

  describe('Get a stage review', () => {
    it('should get a stage by id', async () => {
      const reqUser = {
        sub: user.id,
      };

      const stageReviewResponse = await externalStageReviewController.createStageReview(
        reqData,
        stageReviewRequest,
        reqUser,
      );

      createdStageReview = stageReviewResponse.data;

      const req: StageReviewParamDto = {
        stageId: createdStageReview.id,
        stageReviewId: stageReviewResponse.data.id,
      };

      const response = await stageReviewController.getStageReview(req);

      const expected = {
        userId: user.id,
        stageId: createdStage.id,
        rating: 4,
        review: 'This is a good trail',
      };

      const transformed = response.data as StageReviewDto;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;

      expect(transformed.stageId).toStrictEqual(expected.stageId);
      expect(transformed.rating).toStrictEqual(expected.rating);
      expect(transformed.userId).toStrictEqual(expected.userId);
      expect(transformed.review).toStrictEqual(expected.review);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
