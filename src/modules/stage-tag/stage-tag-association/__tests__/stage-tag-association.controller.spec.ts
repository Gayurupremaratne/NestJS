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
import { UserService } from '@user/user.service';
import { MockAuthGuard } from '../../../../common/mock-modules/auth.guard.mock';
import { AuthGuard } from '../../../casl/authorization-guard';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { StageController } from '../../../stage/stage.controller';
import { StageRepository } from '../../../stage/stage.repository';
import { StageService } from '../../../stage/stage.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { UserRepository } from '../../../user/user.repository';
import { StageTagDto } from '../../dto/stage-tag.dto';
import { PassesService } from '../../../passes/passes.service';
import { StageTagController } from '../../stage-tag.controller';
import { StageTagRepository } from '../../stage-tag.repository';
import { StageTagService } from '../../stage-tag.service';
import { StageTagAssociationController } from '../stage-tag-association.controller';
import { StageTagAssociationRepository } from '../stage-tag-association.repository';
import { StageTagAssociationService } from '../stage-tag-association.service';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagTranslationController', () => {
  let app: INestApplication;
  let stageTagAssociationController: StageTagAssociationController;
  let stageTagController: StageTagController;
  let stageController: StageController;
  let stageTagDto: StageTagDto;
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
      controllers: [StageTagAssociationController, StageController, StageTagController],
      providers: [
        PrismaService,
        StageTagAssociationService,
        StageService,
        StageTagService,
        StageTagAssociationRepository,
        StageTagRepository,
        StageRepository,
        StaticContentRepository,
        StaticContentService,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        UserRepository,
        PassesService,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageController = module.get<StageController>(StageController);
    stageTagController = module.get<StageTagController>(StageTagController);
    stageTagAssociationController = module.get<StageTagAssociationController>(
      StageTagAssociationController,
    );
    prisma = module.get(PrismaService);

    const stageResponseOne = await stageController.createStage(stageRequest);
    stageDtoOne = stageResponseOne.data;

    const stageResponseTwo = await stageController.createStage({ ...stageRequest, number: 2 });
    stageDtoTwo = stageResponseTwo.data;

    const stageTagResponse = await stageTagController.createStageTag();
    stageTagDto = stageTagResponse.data;
  });

  describe('Update a stage tag association', () => {
    it('should update a stage tag association', async () => {
      const stageTagAssociationResponse =
        await stageTagAssociationController.updateStageTagAssociation(
          {
            stageTagId: stageTagDto.id,
          },
          {
            stageIds: [stageDtoOne.id, stageDtoTwo.id],
          },
        );

      expect(Array.isArray(stageTagAssociationResponse.data)).toBeTruthy();
    });
  });

  describe('Get stage tag associations', () => {
    it('should get stage tag associations', async () => {
      const stageTagAssociationResponse =
        await stageTagAssociationController.getStageTagAssociation(
          { stageTagId: stageTagDto.id },
          10,
          1,
        );

      expect(Array.isArray(stageTagAssociationResponse.data.data)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.stage.deleteMany({ where: { id: { in: [stageDtoOne.id, stageDtoTwo.id] } } });
    await prisma.stageTag.delete({ where: { id: stageTagDto.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
