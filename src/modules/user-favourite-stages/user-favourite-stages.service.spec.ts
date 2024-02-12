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
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentService } from '../static-content/static-content.service';
import { UserFavouriteStagesService } from './user-favourite-stages.service';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';

describe('UserFavouriteStagesService Tests', () => {
  let userFavouriteStagesService: UserFavouriteStagesService;
  let prisma: PrismaService;
  let userService: UserService;
  let stageService: StageService;
  const randUUID = uuidv4();

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const userRequest: CreateUserDto = {
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
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

  const userFavouriteStageRequest = {
    userId: userRequest.id,
    stageId: stageRequest.id,
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
        UserService,
        UserFavouriteStagesService,
        PrismaService,
        UserRepository,
        StageRepository,
        PassesService,
        StageService,
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
    userService = moduleRef.get(UserService);
    userService = moduleRef.get(UserService);
    stageService = moduleRef.get(StageService);
    userFavouriteStagesService = moduleRef.get(UserFavouriteStagesService);

    await userService.createUser(userRequest);
    await stageService.createStage(stageRequest);
  });

  it('should be defined', () => {
    expect(userFavouriteStagesService).toBeDefined();
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Get logged user favourite stages', () => {
    it('should get logged user favourite stages', async () => {
      const response = await userFavouriteStagesService.getFavoriteStagesOfLoggedUser(
        10,
        1,
        userFavouriteStageRequest.userId,
      );

      expect(Array.isArray(response.data)).toBeTruthy();
    });
  });

  describe('Create a favourite stage for a specific user', () => {
    it('should create a favourite stage for a specific user', async () => {
      const createdUserFavouriteStage = await userFavouriteStagesService.createFavouriteStage(
        {
          stageId: userFavouriteStageRequest.stageId,
        },
        userFavouriteStageRequest.userId,
      );
      expect(createdUserFavouriteStage).toStrictEqual(userFavouriteStageRequest);
    });
  });

  describe('Delete a favourite stage for a specific user', () => {
    it('should delete a favourite stage for a specific user', async () => {
      const deletedUserFavouriteStage = await userFavouriteStagesService.deleteFavouriteStage(
        {
          stageId: userFavouriteStageRequest.stageId,
        },
        userFavouriteStageRequest.userId,
      );
      expect(deletedUserFavouriteStage).toStrictEqual(userFavouriteStageRequest);
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: userRequest.email } });
    await prisma.stage.delete({ where: { id: stageRequest.id } });
    await prisma.$disconnect();
  });
});
