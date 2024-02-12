import {
  BADGE_TYPES,
  BADGE_TYPE_CODE,
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
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Badge } from '@prisma/client';
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
import { StaticContentController } from '../static-content/static-content.controller';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { AwardManualBadgeController } from './award-manual-badge.controller';
import { BadgeController } from './badge.controller';
import { BadgeRepository } from './badge.repository';
import { BadgeService } from './badge.service';
import { NoticeQueuePublisher } from '../notice/queue/notice.publisher';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { faker } from '@faker-js/faker';

describe('BadgeController', () => {
  let badgeController: BadgeController;
  let stageController: StageController;
  let awardManualBadgeController: AwardManualBadgeController;
  let staticContentController: StaticContentController;
  let app: INestApplication;
  let createdStage: StageDto;
  let createdBadgeForManual: Badge;
  let createdBadgeForStage: Badge;
  let updatedBadge: Badge;
  let prisma: PrismaService;
  let createdAssetKeyForManual;
  let createdAssetKeyForStage;
  let createdAssetKeyForUpdate;
  let mockAbilitiesGuard: AbilitiesGuard;
  let user: UserDto;
  const fileKeyForManual = 'manual.jpeg';
  const fileKeyForStage = 'stage.jpeg';
  const userId = uuidv4();
  let userAssignedManualBadgeRecordId = '';
  let userService: UserService;
  let mockAuthGuard: AuthGuard;
  const fileBuffer = Buffer.from('Your file content goes here', 'utf-8');

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: faker.number.int(1000),
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

  const badgeRequestForManual = {
    badgeKey: '',
    type: BADGE_TYPES[BADGE_TYPE_CODE.MANUAL],
    stageId: null,
    badgeTranslation: [
      {
        localeId: 'en',
        description: 'sample data',
        name: 'sample data',
      },
      {
        localeId: 'fr',
        description: 'sample data',
        name: 'sample data',
      },
      {
        localeId: 'de',
        description: 'sample data',
        name: 'sample data',
      },
    ],
  };

  const badgeRequestForStage = {
    badgeKey: '',
    type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
    stageId: '',
    badgeTranslation: [
      {
        localeId: 'en',
        description: 'sample data',
        name: 'sample data',
      },
      {
        localeId: 'fr',
        description: 'sample data',
        name: 'sample data',
      },
      {
        localeId: 'de',
        description: 'sample data',
        name: 'sample data',
      },
    ],
  };

  const updateBadgeRequest = {
    type: BADGE_TYPES[BADGE_TYPE_CODE.MANUAL],
    badgeKey: '',
    badgeTranslation: [
      {
        localeId: 'en',
        description: 'sample data update',
        name: 'sample data update',
      },
      {
        localeId: 'fr',
        description: 'sample data update',
        name: 'sample data update',
      },
      {
        localeId: 'de',
        description: 'sample data update',
        name: 'sample data update',
      },
    ],
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

  const getSignedUrlRequestForManual = {
    fileName: fileKeyForManual,
    module: STATIC_CONTENT_PATHS.BADGE_MEDIA,
    fileSize: fileBuffer.length,
  };

  const getSignedUrlRequestForStage = {
    fileName: fileKeyForStage,
    module: STATIC_CONTENT_PATHS.BADGE_MEDIA,
    fileSize: fileBuffer.length,
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
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
        BadgeController,
        StageController,
        StaticContentController,
        AwardManualBadgeController,
      ],
      providers: [
        BadgeService,
        BadgeRepository,
        PrismaService,
        StageService,
        StageRepository,
        StaticContentService,
        StaticContentRepository,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        UserService,
        PassesService,
        UserRepository,
        NoticeService,
        NoticeRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
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

    badgeController = module.get<BadgeController>(BadgeController);
    awardManualBadgeController = module.get<AwardManualBadgeController>(AwardManualBadgeController);
    prisma = module.get(PrismaService);
    stageController = module.get<StageController>(StageController);
    staticContentController = module.get<StaticContentController>(StaticContentController);
    userService = module.get<UserService>(UserService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);

    const responseCreateStage = await stageController.createStage(stageRequest);

    createdStage = Object.assign({}, responseCreateStage.data);

    badgeRequestForStage.stageId = createdStage.id;

    createdAssetKeyForManual = await staticContentController.getSignedUrlForStaticMedia(
      getSignedUrlRequestForManual,
    );

    createdAssetKeyForStage = await staticContentController.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    createdAssetKeyForUpdate = await staticContentController.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    badgeRequestForStage.badgeKey = `badge-media/${createdAssetKeyForManual.uniqueFileName}`;
    badgeRequestForManual.badgeKey = `badge-media/${createdAssetKeyForStage.uniqueFileName}`;

    updateBadgeRequest.badgeKey = `badge-media/${createdAssetKeyForUpdate.uniqueFileName}`;

    const userResponse = await userService.createUser(userRequest);
    user = userResponse;
  });

  it('should be defined', () => {
    expect(badgeController).toBeDefined();
  });

  describe('Get all badges', () => {
    it('should get all badges', async () => {
      const responseGetAllBadges = await request(app.getHttpServer()).get('/badges');
      const getAllBadges = Object.assign({}, responseGetAllBadges.body);

      expect(getAllBadges.statusCode).toBe(200);
      expect(Array.isArray(getAllBadges.data.data)).toBe(true);
    });
  });

  describe('Get all badges en', () => {
    it('should get all badges with sortBy in view', async () => {
      const paginatedMetaResult = {
        total: expect.anything(),
        lastPage: expect.anything(),
        currentPage: 1,
        perPage: 10,
      };
      const response = await badgeController.getAllBadgesEn({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'name',
      });
      delete response.data.meta.prev;
      delete response.data.meta.next;
      expect(response.data.meta).toEqual(paginatedMetaResult);
    });
  });

  describe('Create a badge', () => {
    it('should create a badge for manual', async () => {
      const responseCreateBadge = await badgeController.createBadge(badgeRequestForManual);
      createdBadgeForManual = Object.assign({}, responseCreateBadge.data);

      expect(createdBadgeForManual).toHaveProperty('badgeKey', badgeRequestForManual.badgeKey);
      expect(createdBadgeForManual).toHaveProperty('type', badgeRequestForManual.type);
      expect(createdBadgeForManual).toHaveProperty('stageId', badgeRequestForManual.stageId);
    });

    it('should create a badge for stage', async () => {
      const responseCreateBadge = await badgeController.createBadge(badgeRequestForStage);
      createdBadgeForStage = Object.assign({}, responseCreateBadge.data);

      expect(createdBadgeForStage).toHaveProperty('badgeKey', badgeRequestForStage.badgeKey);
      expect(createdBadgeForStage).toHaveProperty('type', badgeRequestForStage.type);
      expect(createdBadgeForStage).toHaveProperty('stageId', badgeRequestForStage.stageId);
    });
  });

  describe('Get a specific badge', () => {
    it('should get a specific badge', async () => {
      const responseGetBadge = await request(app.getHttpServer()).get(
        `/badges/${createdBadgeForStage.id}`,
      );
      const getBadge = Object.assign({}, responseGetBadge.body);

      expect(getBadge.statusCode).toBe(200);
      expect(getBadge.data).toHaveProperty('id', createdBadgeForStage.id);
    });
  });

  describe('Get the badge by stageId', () => {
    it('should get the badge by stageId', async () => {
      const responseGetBadge = await request(app.getHttpServer()).get(
        `/badges/stage/${badgeRequestForStage.stageId}`,
      );
      const getBadgeByStageId = Object.assign({}, responseGetBadge.body);

      expect(getBadgeByStageId.statusCode).toBe(200);
      expect(getBadgeByStageId.data).toHaveProperty('stageId', badgeRequestForStage.stageId);
    });
  });

  describe('Get a specific users awarded badges', () => {
    it('should get a specific badge', async () => {
      const responseGetBadge = await request(app.getHttpServer()).get(`/badges/users/${userId}`);
      const getBadge = Object.assign({}, responseGetBadge.body);

      expect(getBadge.statusCode).toBe(200);
    });
  });

  describe('Assign a manual badge to a user', () => {
    it('should assign a manual badge to a user', async () => {
      const responseAssignManualBadgeToUser = await request(app.getHttpServer()).post(
        `/badges/${createdBadgeForManual.id}/users/${userId}`,
      );

      const assignManualBadgeToUser = Object.assign({}, responseAssignManualBadgeToUser.body);

      userAssignedManualBadgeRecordId = assignManualBadgeToUser.data.id;

      expect(assignManualBadgeToUser.data).toHaveProperty('badgeId', createdBadgeForManual.id);
      expect(assignManualBadgeToUser.data).toHaveProperty('userId', userId);
    });
  });

  describe('Fail to assign a manual badge to a user where that badge is already assigned', () => {
    it('should fail assign a manual badge to a user', async () => {
      const assignBadgeAsync = async () => {
        await awardManualBadgeController.assignManualBadgeToUser({
          userId,
          badgeId: createdBadgeForManual.id,
        });
      };

      // Use expect().rejects.toThrow() to assert that an exception is thrown
      await expect(assignBadgeAsync()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Fail to assign a manual badge to a user where that badge is a stage badge', () => {
    it('should fail assign a manual badge to a user', async () => {
      const assignBadgeAsync = async () => {
        await awardManualBadgeController.assignManualBadgeToUser({
          userId,
          badgeId: createdBadgeForStage.id,
        });
      };

      // Use expect().rejects.toThrow() to assert that an exception is thrown
      await expect(assignBadgeAsync()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Get the latest badge for logged user', () => {
    it('should get the latest badge for the logged user', async () => {
      const latestCreatedAt = new Date();
      const oldestCreatedAt = new Date();
      oldestCreatedAt.setDate(latestCreatedAt.getDate() - 1);
      const userBadgeLatest = await prisma.userAwardedBadge.create({
        data: {
          badgeId: createdBadgeForManual.id,
          userId,
          createdAt: latestCreatedAt,
        },
      });
      await prisma.userAwardedBadge.create({
        data: {
          badgeId: createdBadgeForManual.id,
          userId,
          createdAt: oldestCreatedAt,
        },
      });
      const reqUser = {
        sub: user.id,
      };
      const responseGetBadge = await badgeController.getLoggedUserLatestBadge(reqUser);

      expect(responseGetBadge.data.id).toEqual(userBadgeLatest.badgeId);
    });
  });

  describe('Update a specific badge', () => {
    it('should update a specific badge', async () => {
      const updatedBadgeManualRequest = {
        type: BADGE_TYPES[BADGE_TYPE_CODE.MANUAL],
        badgeKey: badgeRequestForStage.badgeKey,
        badgeTranslation: [
          {
            localeId: 'en',
            description: 'sample data update',
            name: 'sample data update',
          },
        ],
      };

      const responseUpdateBadge = await request(app.getHttpServer())
        .put(`/badges/${createdBadgeForStage.id}`)
        .send(updatedBadgeManualRequest);

      updatedBadge = Object.assign({}, responseUpdateBadge.body.data);
      expect(updatedBadge).toHaveProperty('type', BADGE_TYPES[BADGE_TYPE_CODE.MANUAL]);
    });
  });

  describe('Delete a specific badge', () => {
    it('should delete a specific badge', async () => {
      const responseDeletedBadge = await request(app.getHttpServer()).delete(
        `/badges/${createdBadgeForStage.id}`,
      );
      const deletedBadge = Object.assign({}, responseDeletedBadge.body);

      expect(deletedBadge.statusCode).toBe(200);
      expect(deletedBadge.data).toHaveProperty('id', createdBadgeForStage.id);
    });
  });

  describe('Delete assigned badge from user', () => {
    it('should delete a specific assigned badge from user', async () => {
      const responseDeletedUserAssignedBadge = await request(app.getHttpServer()).delete(
        `/badges/users/${userAssignedManualBadgeRecordId}`,
      );
      const deletedUserAssignedBadge = Object.assign({}, responseDeletedUserAssignedBadge.body);

      expect(deletedUserAssignedBadge.statusCode).toBe(200);
    });
  });

  afterAll(async () => {
    await prisma.badge.delete({ where: { id: createdBadgeForManual.id } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.stage.delete({ where: { id: badgeRequestForStage.stageId } });
    await prisma.$disconnect();
    await app.close();
  });
});
