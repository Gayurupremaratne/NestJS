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
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StageDto } from '../../stage/dto/stage.dto';
import { StageReviewsRepository as ExternalStageReviewsRepository } from '../../stage/stage-review/stage-review.repository';
import { StageReviewService as ExternalStageReviewService } from '../../stage/stage-review/stage-review.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserDto } from '../../user/dto/user.dto';
import { StageReviewDto } from '../dto/stage-review.dto';
import { StageReviewsRepository } from '../stage-review.repository';
import { StageReviewService } from '../stage-review.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';

describe('StageReviewService', () => {
  let createdStage: StageDto;
  let createdStageReview: StageReviewDto;
  let prisma: PrismaService;
  let userService: UserService;
  let stageService: StageService;
  let stageReviewService: StageReviewService;
  let externalStageService: ExternalStageReviewService;
  const userId = uuidv4();
  let user: UserDto;

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
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

  const stageReviewRequest = {
    userId,
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
    externalStageService = moduleRef.get(ExternalStageReviewService);

    createdStage = await stageService.createStage(stageRequest);
    user = await userService.createUser(userRequest);
    createdStageReview = await externalStageService.createStageReview(
      createdStage.id,
      stageReviewRequest,
      user.id,
    );
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Get a stage review', () => {
    it('should get a stage review', async () => {
      const expected = {
        userId,
        stageId: createdStage.id,
        rating: 4,
        review: 'This is a good trail',
      };

      const retrievedStage = await stageReviewService.getStageReview(createdStageReview.id);
      delete retrievedStage.id;
      delete retrievedStage.createdAt;
      delete retrievedStage.updatedAt;
      expect(retrievedStage).toEqual(expected);
    });

    it('should throw if the stage review is not found', async () => {
      async function asyncFunctionThatThrowsError() {
        await stageReviewService.getStageReview('11111111-5297-4b4b-a8ce-7f7627f4fece');
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(NotFoundException);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
