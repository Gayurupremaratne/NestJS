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
import { Test } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { PassesService } from '../../../passes/passes.service';
import { StageReviewsRepository as ExternalStageReviewsRepository } from '../../../stage-review/stage-review.repository';
import { StageReviewService as ExternalStageReviewService } from '../../../stage-review/stage-review.service';
import { StaticContentService } from '../../../static-content/static-content.service';
import { StageDto } from '../../dto/stage.dto';
import { StageRepository } from '../../stage.repository';
import { StageService } from '../../stage.service';
import { StageReviewsRepository } from '../stage-review.repository';
import { StageReviewService } from '../stage-review.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';

describe('StageReviewService', () => {
  let createdStage: StageDto;
  let prisma: PrismaService;
  let userService: UserService;
  let stageService: StageService;
  let stageReviewService: StageReviewService;
  const userId = uuidv4();
  let user: UserDto;

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
    number: 102,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
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

  const expected = {
    userId,
    rating: 4,
    review: 'This is a good trail',
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        PrismaService,
        StageReviewService,
        StageReviewsRepository,
        StageService,
        StageRepository,
        ExternalStageReviewService,
        ExternalStageReviewsRepository,
        UserService,
        UserRepository,
        PassesService,
        { provide: KeycloakService, useValue: mockKeycloakService },
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
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageReviewService = moduleRef.get(StageReviewService);
    stageService = moduleRef.get(StageService);
    userService = moduleRef.get(UserService);

    createdStage = await stageService.createStage(stageRequest);
    user = await userService.createUser(userRequest);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create a stage review', () => {
    it('should create a stage review', async () => {
      const createdStageReview = await stageReviewService.createStageReview(
        createdStage.id,
        stageReviewRequest,
        user.id,
      );
      delete createdStageReview.id;
      delete createdStageReview.createdAt;
      delete createdStageReview.updatedAt;
      expect(createdStageReview).toEqual({ ...expected, stageId: createdStage.id });
    });
  });

  describe('Create a stage review', () => {
    it('should create a stage review', async () => {
      const createdStageReview = await stageReviewService.getAllStageReviews(
        createdStage.id,
        1,
        10,
      );
      expect(Array.isArray(createdStageReview.data)).toBe(true);
    });
  });

  describe('Update a stage review', () => {
    it('should update a stage review', async () => {
      const createdStageReview = await stageReviewService.createStageReview(
        createdStage.id,
        stageReviewRequest,
        user.id,
      );
      const updatedStageReview = await stageReviewService.updateStageReview(
        createdStage.id,
        createdStageReview.id,
        { ...stageReviewRequest, rating: 1 },
        user.id,
      );
      delete updatedStageReview.id;
      delete updatedStageReview.createdAt;
      delete updatedStageReview.updatedAt;
      expect(updatedStageReview).toEqual({ ...expected, stageId: createdStage.id, rating: 1 });
    });

    it('should throw error when updating a stage review by diff user', async () => {
      const createdStageReview = await stageReviewService.createStageReview(
        createdStage.id,
        stageReviewRequest,
        user.id,
      );
      try {
        await stageReviewService.updateStageReview(
          createdStage.id,
          createdStageReview.id,
          { ...stageReviewRequest, rating: 1 },
          uuidv4(),
        );
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Delete a stage review', () => {
    it('should delete a stage review', async () => {
      const response = await stageReviewService.createStageReview(
        createdStage.id,
        stageReviewRequest,
        user.id,
      );
      const deletedStageReviewId = await stageReviewService.deleteStageReview(
        createdStage.id,
        response.id,
      );
      expect(response.id).toStrictEqual(deletedStageReviewId);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
