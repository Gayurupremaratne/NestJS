import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
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
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { MockAuthGuard } from '../../../../common/mock-modules/auth.guard.mock';
import { AuthGuard } from '../../../casl/authorization-guard';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { PassesService } from '../../../passes/passes.service';
import { StageController } from '../../stage.controller';
import { StageRepository } from '../../stage.repository';
import { StageService } from '../../stage.service';
import { StageRegionController } from '../stage-region.controller';
import { StageRegionRepository } from '../stage-region.repository';
import { StageRegionService } from '../stage-region.service';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageRegionController', () => {
  let app: INestApplication;
  let stageRegionController: StageRegionController;
  let stageController: StageController;
  let stageDtoOne: StageDto;
  let stageDtoTwo: StageDto;
  let prisma: PrismaService;

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
    cumulativeReviews: 0,
    reviewsCount: 0,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
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
      controllers: [StageRegionController, StageController],
      providers: [
        PrismaService,
        StageRegionService,
        StageService,
        StageRegionRepository,
        StageRepository,
        StaticContentService,
        StaticContentRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        PassesService,
        UserRepository,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageController = module.get<StageController>(StageController);
    stageRegionController = module.get<StageRegionController>(StageRegionController);
    prisma = module.get(PrismaService);

    const stageResponseOne = await stageController.createStage(stageRequest);
    stageDtoOne = stageResponseOne.data;

    const stageResponseTwo = await stageController.createStage({ ...stageRequest, number: 2 });
    stageDtoTwo = stageResponseTwo.data;
  });

  describe('Add a stage region', () => {
    it('should add a stage region', async () => {
      const stageRegionResponse = await stageRegionController.createStageRegion(
        { stageId: stageDtoOne.id },
        {
          regionIds: [1],
        },
      );

      expect(Array.isArray(stageRegionResponse.data)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageDtoOne.id } });
    await prisma.stage.delete({ where: { id: stageDtoTwo.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
