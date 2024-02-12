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
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Badge } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StageDto } from '../stage/dto/stage.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { BadgeRepository } from './badge.repository';
import { BadgeService } from './badge.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('BadgeService', () => {
  let badgeService: BadgeService;
  let stageService: StageService;
  let staticContentService: StaticContentService;
  let userService: UserService;
  let app: INestApplication;
  let prisma: PrismaService;
  let createdStage: StageDto;
  let createdBadgeForManual: Badge;
  let createdBadgeForStage: Badge;
  let updatedBadge: Badge;
  let createdAssetKeyForManual;
  let createdAssetKeyForStage;
  let createdAssetKeyForUpdate;
  const fileKeyForManual = 'manual.jpeg';
  const fileKeyForStage = 'stage.jpeg';
  const userId = uuidv4();
  let userAssignedManualBadgeRecordId = '';

  const stageRequest = {
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
    fileSize: 1000,
  };

  const getSignedUrlRequestForStage = {
    fileName: fileKeyForStage,
    module: STATIC_CONTENT_PATHS.BADGE_MEDIA,
    fileSize: 1000,
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
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
        BadgeService,
        PrismaService,
        BadgeRepository,
        StageService,
        StageRepository,
        StaticContentService,
        StaticContentRepository,
        UserService,
        PassesService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prisma = module.get(PrismaService);
    badgeService = module.get<BadgeService>(BadgeService);
    stageService = module.get<StageService>(StageService);
    staticContentService = module.get<StaticContentService>(StaticContentService);
    userService = module.get<UserService>(UserService);

    const stageResponse = await stageService.createStage(stageRequest);
    createdStage = Object.assign({}, stageResponse);
    badgeRequestForStage.stageId = createdStage.id;

    createdAssetKeyForManual = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForManual,
    );

    createdAssetKeyForStage = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    createdAssetKeyForUpdate = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    badgeRequestForStage.badgeKey = `badge-media/${createdAssetKeyForManual.uniqueFileName}`;
    badgeRequestForManual.badgeKey = `badge-media/${createdAssetKeyForStage.uniqueFileName}`;

    updateBadgeRequest.badgeKey = `badge-media/${createdAssetKeyForUpdate.uniqueFileName}`;

    await userService.createUser(userRequest);
  });

  it('should be defined', () => {
    expect(badgeService).toBeDefined();
  });

  describe('Get all badges', () => {
    it('should get all badges', async () => {
      const getBadgesParams = {
        perPage: 10,
        pageNumber: 1,
      };
      const responseGetAllBadges = await badgeService.getAllBadges(getBadgesParams);
      const getAllBadges = Object.assign({}, responseGetAllBadges);

      expect(Array.isArray(getAllBadges.data)).toBe(true);
    });
  });

  describe('Create a badge', () => {
    it('should create a badge for manual', async () => {
      const responseCreateBadge = await badgeService.createBadge(badgeRequestForManual);
      createdBadgeForManual = Object.assign({}, responseCreateBadge);

      expect(createdBadgeForManual).toHaveProperty('badgeKey', badgeRequestForManual.badgeKey);
      expect(createdBadgeForManual).toHaveProperty('type', badgeRequestForManual.type);
      expect(createdBadgeForManual).toHaveProperty('stageId', badgeRequestForManual.stageId);
    });

    it('should create a badge for stage', async () => {
      const responseCreateBadge = await badgeService.createBadge(badgeRequestForStage);
      createdBadgeForStage = Object.assign({}, responseCreateBadge);

      expect(createdBadgeForStage).toHaveProperty('badgeKey', badgeRequestForStage.badgeKey);
      expect(createdBadgeForStage).toHaveProperty('type', badgeRequestForStage.type);
      expect(createdBadgeForStage).toHaveProperty('stageId', badgeRequestForStage.stageId);
    });
  });

  describe('Get a specific badge', () => {
    it('should get a specific badge', async () => {
      const responseGetBadge = await badgeService.getBadge(createdBadgeForStage.id);
      const getBadge = Object.assign({}, responseGetBadge);

      expect(getBadge).toHaveProperty('id', createdBadgeForStage.id);
    });
  });

  describe('Get the badge by stageId', () => {
    it('should get the badge by stageId', async () => {
      const responseGetBadge = await badgeService.getBadgeByStageId(createdBadgeForStage.stageId);
      const getBadgeByStageId = Object.assign({}, responseGetBadge);

      expect(getBadgeByStageId).toHaveProperty('id', createdBadgeForStage.id);
    });
  });

  describe('Get all badges for a specific user', () => {
    it('should get all badges for a specific user', async () => {
      const responseGetUserBadges = await badgeService.getUserBadges(userId);

      expect(Array.isArray(responseGetUserBadges)).toBe(true);
    });
  });

  describe('Assign a manual badge to a specific user', () => {
    it('should assign a manual badge to a specific user', async () => {
      const responseAssignManualBadge = await badgeService.assignManualBadgeToUser(
        userId,
        createdBadgeForManual.id,
      );
      const assignManualBadge = Object.assign({}, responseAssignManualBadge);
      userAssignedManualBadgeRecordId = assignManualBadge.id;

      expect(assignManualBadge).toHaveProperty('badgeId', createdBadgeForManual.id);
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
      const responseGetBadge = await badgeService.getLoggedUserLatestBadge(userId);

      expect(responseGetBadge.id).toEqual(userBadgeLatest.badgeId);
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
      const responseUpdateBadge = await badgeService.updateBadge(
        createdBadgeForStage.id,
        updatedBadgeManualRequest,
      );
      updatedBadge = Object.assign({}, responseUpdateBadge);

      expect(updatedBadge).toHaveProperty('type', BADGE_TYPES[BADGE_TYPE_CODE.MANUAL]);
    });
  });

  describe('Delete a specific badge', () => {
    it('should delete a specific badge', async () => {
      const responseDeletedBadge = await badgeService.deleteBadge(createdBadgeForStage.id);
      const deletedBadge = Object.assign({}, responseDeletedBadge);

      expect(deletedBadge).toHaveProperty('id', createdBadgeForStage.id);
    });
  });

  describe('Delete assigned badge from user', () => {
    it('should delete a specific assigned badge from user', async () => {
      const responseDeletedUserAssignedBadge = await badgeService.deleteUserAssignedBadge(
        userAssignedManualBadgeRecordId,
      );
      const deletedUserAssignedBadge = Object.assign({}, responseDeletedUserAssignedBadge);

      expect(deletedUserAssignedBadge).toHaveProperty('id', userAssignedManualBadgeRecordId);
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
