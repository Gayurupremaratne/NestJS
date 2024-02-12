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
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
// import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../../../common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '../../../../common/mock-modules/auth.guard.mock';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../../casl/abilities.guard';
import { AuthGuard } from '../../../casl/authorization-guard';
import { FcmTokensService } from '../../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { MailService } from '../../../mail/mail.service';
import { NoticeRepository } from '../../../notice/notice.repository';
import { NoticeService } from '../../../notice/notice.service';
import { OrderRepository } from '../../../order/order.repository';
import { PassInventoryService } from '../../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../../passes/passes.service';
import { StageReviewsRepository as ExternalStageReviewsRepository } from '../../../stage-review/stage-review.repository';
import { StageReviewService as ExternalStageReviewService } from '../../../stage-review/stage-review.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { StageReviewController as ExternalStageReviewController } from '../../stage-review/stage-review.controller';
import { StageController } from '../../stage.controller';
import { StageRepository } from '../../stage.repository';
import { StageService } from '../../stage.service';
import { StageReviewParamDto } from '../dto/stage-review-param.dto';
import { StageReviewDto } from '../dto/stage-review.dto';
import { StageReviewController } from '../stage-review.controller';
import { StageReviewsRepository } from '../stage-review.repository';
import { StageReviewService } from '../stage-review.service';
import { NoticeQueuePublisher } from '../../../notice/queue/notice.publisher';
import { PushNotificationService } from '../../../push-notification/push-notification.service';

describe('StageReviewController', () => {
  let app: INestApplication;
  let stageReviewController: StageReviewController;
  let mockAbilitiesGuard: AbilitiesGuard;
  let createdStage: StageDto;
  let user: UserDto;
  let prisma: PrismaService;
  const userId = uuidv4();
  let userService: UserService;
  let mockAuthGuard: AuthGuard;

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    openTime: '16:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    number: 101,
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

  const expectedStageReview = {
    userId,
    rating: 4,
    review: 'This is a good trail',
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
      controllers: [StageReviewController, ExternalStageReviewController, StageController],
      providers: [
        NoticeService,
        NoticeRepository,
        StaticContentRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        PrismaService,
        StageReviewService,
        StageReviewsRepository,
        StageService,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        StageRepository,
        ExternalStageReviewService,
        ExternalStageReviewsRepository,
        UserService,
        PassesService,
        UserRepository,
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
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    userService = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);

    const stageResponse = await request(app.getHttpServer()).post('/stages').send(stageRequest);
    createdStage = stageResponse.body.data;

    const userResponse = await userService.createUser(userRequest);
    user = userResponse;
  });

  it('should be defined', () => {
    expect(stageReviewController).toBeDefined();
  });

  describe('Create a stage review', () => {
    it('should create a stage review', async () => {
      reqData.stageId = createdStage.id;
      const reqUser = {
        sub: user.id,
      };

      const stageReviewResponse = await stageReviewController.createStageReview(
        reqData,
        stageReviewRequest,
        reqUser,
      );
      expect(stageReviewResponse.data).toMatchObject({
        ...expectedStageReview,
        stageId: createdStage.id,
      });
    });
  });

  describe('Get all stage reviews', () => {
    it('should return all  stage reviews', async () => {
      const response = await request(app.getHttpServer()).get(
        `/stages/${createdStage.id}/stage-reviews`,
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
  });

  describe('Update a stage review', () => {
    it('should update a stage review', async () => {
      const stageReviewToUpdate = {
        ...stageReviewRequest,
        rating: 1,
        review: "I've changed my rating",
      };

      const reqUser = {
        sub: user.id,
      };

      const stageReviewResponse = await stageReviewController.createStageReview(
        reqData,
        stageReviewRequest,
        reqUser,
      );

      reqData.stageId = createdStage.id;
      reqData.stageReviewId = stageReviewResponse.data.id;

      const updatedStageReviewResponse = await stageReviewController.updateStageReview(
        reqData,
        stageReviewToUpdate,
        reqUser,
      );

      const expected = {
        ...expectedStageReview,
        rating: 1,
        review: "I've changed my rating",
      };

      expect(updatedStageReviewResponse.data.review).toBe(expected.review);
      expect(updatedStageReviewResponse.data.rating).toBe(expected.rating);
    });
  });

  describe('Delete a stage review', () => {
    it('should delete a stage review', async () => {
      const reqUser = {
        sub: user.id,
      };

      const stageReviewResponse = await stageReviewController.createStageReview(
        reqData,
        stageReviewRequest,
        reqUser,
      );

      const transformed = stageReviewResponse.data as StageReviewDto;
      const deletedStageReviewResponseId = await request(app.getHttpServer()).delete(
        `/stages/${createdStage.id}/stage-reviews/${transformed.id}`,
      );

      expect(deletedStageReviewResponseId.body.data).toStrictEqual(transformed.id);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
