import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { BadgeRepository } from './badge.repository';
import { v4 as uuidv4 } from 'uuid';
import {
  BADGE_TYPES,
  BADGE_TYPE_CODE,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
  STATUS_CODE,
} from '@common/constants';
import { StageService } from '../stage/stage.service';
import { StageRepository } from '../stage/stage.repository';
import { StageDto } from '../stage/dto/stage.dto';
import { Badge } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  INestApplication,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/app-config';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { UserDto } from '@user/dto/user.dto';
import { UserRepository } from '@user/user.repository';
import { KeycloakService } from '../keycloak/keycloak.service';

describe('BadgeRepository', () => {
  let badgeRepository: BadgeRepository;
  let userRepository: UserRepository;
  let stageService: StageService;
  let staticContentService: StaticContentService;
  let app: INestApplication;
  let prisma: PrismaService;
  let createdStage: StageDto;
  let createdStage2: StageDto;
  let createdBadgeForManual: Badge;
  let createdBadgeForStage: Badge;
  let createdBadgeForStage2: Badge;
  let createdAssetKeyForManual;
  let createdAssetKeyForStage;
  let createdAssetKeyForStage2;
  let createdAssetKeyForUpdate;
  let createdAssetKeyForUpdateUserAwardedBadge;
  let user: UserDto;
  const fileKeyForManual = 'manual.jpeg';
  const fileKeyForStage = 'stage.jpeg';
  const fileKeyForStage2 = 'stage2.jpeg';
  const fileKeyForUserAwardedBadge = 'stage3.jpeg';
  const userId1 = uuidv4();

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
    kmlFileKey: null,
    startPoint: null,
    endPoint: null,
  };

  const stageRequest2 = {
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
    kmlFileKey: null,
    startPoint: null,
    endPoint: null,
  };

  const badgeRequestForManual = {
    badgeKey: '',
    type: BADGE_TYPES[BADGE_TYPE_CODE.MANUAL],
    stageId: null,
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

  const badgeRequestForStage = {
    badgeKey: '',
    type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
    stageId: '',
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

  const badgeRequestForStage2 = {
    badgeKey: '',
    type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
    stageId: '',
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

  const updateUserAwardedBadgeRequest = {
    type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
    stageId: '',
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

  const getSignedUrlRequestForStage2 = {
    fileName: fileKeyForStage2,
    module: STATIC_CONTENT_PATHS.BADGE_MEDIA,
    fileSize: 1000,
  };

  const getSignedUrlRequestForUserAwardedBadge = {
    fileName: fileKeyForUserAwardedBadge,
    module: STATIC_CONTENT_PATHS.BADGE_MEDIA,
    fileSize: 1000,
  };

  const userRequest = {
    id: userId1,
    firstName: 'test',
    lastName: 'test',
    email: `test${userId1}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  beforeAll(async () => {
    const mockKeycloakService = {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      logout: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        PrismaService,
        ConfigService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        BadgeRepository,
        StageService,
        StageRepository,
        StaticContentService,
        StaticContentRepository,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prisma = module.get(PrismaService);
    userRepository = module.get<UserRepository>(UserRepository);
    stageService = module.get<StageService>(StageService);
    badgeRepository = module.get<BadgeRepository>(BadgeRepository);
    staticContentService = module.get<StaticContentService>(StaticContentService);

    const stageResponse = await stageService.createStage(stageRequest);
    createdStage = Object.assign({}, stageResponse);
    badgeRequestForStage.stageId = createdStage.id;

    const stageResponse2 = await stageService.createStage(stageRequest2);
    createdStage2 = Object.assign({}, stageResponse2);
    badgeRequestForStage2.stageId = createdStage2.id;

    const userResponse = await userRepository.createUser(userRequest);
    user = Object.assign({}, userResponse);

    createdAssetKeyForManual = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForManual,
    );

    createdAssetKeyForStage = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    createdAssetKeyForStage2 = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage2,
    );

    createdAssetKeyForUpdate = await staticContentService.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStage,
    );

    createdAssetKeyForUpdateUserAwardedBadge =
      await staticContentService.getSignedUrlForStaticMedia(getSignedUrlRequestForUserAwardedBadge);

    badgeRequestForStage.badgeKey = `badge-media/${createdAssetKeyForManual.uniqueFileName}`;
    badgeRequestForManual.badgeKey = `badge-media/${createdAssetKeyForStage.uniqueFileName}`;
    badgeRequestForStage2.badgeKey = `badge-media/${createdAssetKeyForStage2.uniqueFileName}`;

    updateBadgeRequest.badgeKey = `badge-media/${createdAssetKeyForUpdate.uniqueFileName}`;
    updateUserAwardedBadgeRequest.badgeKey = `badge-media/${createdAssetKeyForUpdateUserAwardedBadge.uniqueFileName}`;
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  it('should be defined', () => {
    expect(badgeRepository).toBeDefined();
  });

  describe('Get all badges', () => {
    it('should get all badges', async () => {
      const getBadgesParams = {
        perPage: 10,
        pageNumber: 1,
      };
      const responseGetAllBadges = await badgeRepository.getAllBadges(getBadgesParams);
      const getAllBadges = Object.assign({}, responseGetAllBadges);

      expect(Array.isArray(getAllBadges.data)).toBe(true);
    });
  });

  describe('Create a badge', () => {
    it('should create a badge for manual', async () => {
      const responseCreateBadge = await badgeRepository.createBadge(badgeRequestForManual);
      createdBadgeForManual = Object.assign({}, responseCreateBadge);
      try {
        await badgeRepository.assignManualBadgeToUser(user.id, createdBadgeForManual.id);
      } catch (error) {
        console.log(error);
      }
      expect(createdBadgeForManual).toHaveProperty('badgeKey', badgeRequestForManual.badgeKey);
      expect(createdBadgeForManual).toHaveProperty('type', badgeRequestForManual.type);
      expect(createdBadgeForManual).toHaveProperty('stageId', badgeRequestForManual.stageId);
    });

    it('should create a badge for stage', async () => {
      const responseCreateBadge = await badgeRepository.createBadge(badgeRequestForStage);
      createdBadgeForStage = Object.assign({}, responseCreateBadge);

      expect(createdBadgeForStage).toHaveProperty('badgeKey', badgeRequestForStage.badgeKey);
      expect(createdBadgeForStage).toHaveProperty('type', badgeRequestForStage.type);
      expect(createdBadgeForStage).toHaveProperty('stageId', badgeRequestForStage.stageId);
    });

    it('should create a badge for stage 2', async () => {
      const responseCreateBadge = await badgeRepository.createBadge(badgeRequestForStage2);
      createdBadgeForStage2 = Object.assign({}, responseCreateBadge);

      expect(createdBadgeForStage2).toHaveProperty('badgeKey', badgeRequestForStage2.badgeKey);
      expect(createdBadgeForStage2).toHaveProperty('type', badgeRequestForStage2.type);
      expect(createdBadgeForStage2).toHaveProperty('stageId', badgeRequestForStage2.stageId);
    });

    it('should throw an UnprocessableEntityException when creating a badge with duplicate badgeKey', async () => {
      try {
        const responseCreateDuplicateBadge =
          await badgeRepository.createBadge(badgeRequestForManual);
        createdBadgeForManual = Object.assign({}, responseCreateDuplicateBadge);
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
      }
    });

    it('should throw an InternalServerErrorException when an unexpected Prisma error occurs during badge creation', async () => {
      badgeRepository['prisma'].badge.create = jest.fn(() => {
        throw new Error('Some unexpected error');
      });

      try {
        await badgeRepository.createBadge(badgeRequestForManual);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('should throw an InternalServerErrorException when an unexpected Prisma error occurs during badge creation', async () => {
      badgeRepository['prisma'].badge.create = jest.fn(() => {
        throw new Error('Some unexpected error');
      });

      try {
        await badgeRepository.createBadge(badgeRequestForManual);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Get a specific badge', () => {
    it('should get a specific badge', async () => {
      const responseGetBadge = await badgeRepository.getBadge(createdBadgeForStage.id);
      const getBadge = Object.assign({}, responseGetBadge);

      expect(getBadge).toHaveProperty('id', createdBadgeForStage.id);
    });

    it('should throw a NotFoundException when the badge does not exist', async () => {
      badgeRepository['prisma'].badge.findUnique = jest.fn(() => null);

      try {
        await badgeRepository.getBadge('non-existent-badge-id');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Badge not found');
      }
    });
  });

  describe('Get the badge by stage Id', () => {
    it('should get the badge by stage Id', async () => {
      const responseGetBadge = await badgeRepository.getBadgeByStageId(
        createdBadgeForStage.stageId,
      );
      const getBadgeByStageId = Object.assign({}, responseGetBadge);

      expect(getBadgeByStageId).toHaveProperty('id', createdBadgeForStage.id);
    });

    it('should throw a NotFoundException when the badge does not exist', async () => {
      badgeRepository['prisma'].badge.findFirst = jest.fn(() => null);

      try {
        await badgeRepository.getBadgeByStageId('non-existent-badge-id');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Badge for the specified stage ID not found');
      }
    });
  });

  describe('Update a specific badge', () => {
    it('should update a specific badge successfully', async () => {
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
      const responseUpdateBadge = await badgeRepository.updateBadge(
        createdBadgeForStage.id,
        updatedBadgeManualRequest,
      );
      const updatedBadge = Object.assign({}, responseUpdateBadge);

      expect(updatedBadge).toHaveProperty('type', BADGE_TYPES[BADGE_TYPE_CODE.MANUAL]);
    });

    it('should update a badge with stage connection when type is STAGE_COMPLETION and stageId is provided', async () => {
      const updatedBadgeRequest = {
        type: BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION],
        stageId: badgeRequestForStage.stageId,
        badgeKey: badgeRequestForStage.badgeKey,
        badgeTranslation: [
          {
            localeId: 'en',
            description: 'sample data update',
            name: 'sample data update',
          },
        ],
      };

      const responseUpdateBadge = await badgeRepository.updateBadge(
        createdBadgeForStage.id,
        updatedBadgeRequest,
      );
      const updatedBadge = Object.assign({}, responseUpdateBadge);

      expect(updatedBadge).toHaveProperty('type', BADGE_TYPES[BADGE_TYPE_CODE.STAGE_COMPLETION]);
    });

    it('should disconnect a stage when changing badge type to MANUAL', async () => {
      // Create an update request with 'MANUAL' type (disconnects stage)
      const updatedBadgeRequest = {
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

      const responseUpdateBadge = await badgeRepository.updateBadge(
        createdBadgeForStage.id,
        updatedBadgeRequest,
      );

      const updatedBadge = Object.assign({}, responseUpdateBadge);

      // Check if the stage is disconnected (stage property should be null)
      expect(updatedBadge.stageId).toBeNull();
    });

    it('should throw an UnprocessableEntityException when updating a badge with a duplicate badgeKey', async () => {
      try {
        await badgeRepository.updateBadge(createdBadgeForManual.id, updateBadgeRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
      }
    });

    it('should throw an ConflictException when updating a badge with a stage that already has a badge', async () => {
      try {
        await badgeRepository.updateBadge(createdBadgeForStage.id, badgeRequestForStage2);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toBe('The new stage already has a badge');
      }
    });

    it('should throw InternalServerErrorException for unexpected Prisma errors', async () => {
      const badgeId = 'some-badge-id';
      const updateBadgeDto = {
        type: BADGE_TYPES[BADGE_TYPE_CODE.MANUAL],
        badgeKey: 'some-badge-key',
        badgeTranslation: [
          {
            localeId: 'en',
            description: 'Updated description',
            name: 'Updated name',
          },
        ],
      };

      prisma.$transaction = jest.fn(async () => {
        throw new Error('Some unexpected error');
      });

      try {
        await badgeRepository.updateBadge(badgeId, updateBadgeDto);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Delete a specific badge', () => {
    it('should delete a specific badge', async () => {
      const responseDeletedBadge = await badgeRepository.deleteBadge(createdBadgeForStage.id);
      const deletedBadge = Object.assign({}, responseDeletedBadge);

      expect(deletedBadge).toHaveProperty('id', createdBadgeForStage.id);
    });

    it('should throw an ConflictException when deleting a badge that is assigned to a user', async () => {
      try {
        await badgeRepository.deleteBadge(createdBadgeForManual.id);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'You cannot delete this badge since its already assigned to a user.',
        );
      }
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: badgeRequestForStage.stageId } });
    await prisma.stage.delete({ where: { id: badgeRequestForStage2.stageId } });

    await prisma.$disconnect();
    await app.close();
  });
});
