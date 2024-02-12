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
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { StageDto } from '../dto/stage.dto';
import { StageController } from '../stage.controller';
import { StageRepository } from '../stage.repository';
import { StageService } from '../stage.service';
import { StageTranslationDto } from './dto/stage-translation.dto';
import { StageTranslationController } from './stage-translation.controller';
import { StageTranslationRepository } from './stage-translation.repository';
import { StageTranslationService } from './stage-translation.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTranslationController', () => {
  let app: INestApplication;
  let stageTranslationController: StageTranslationController;
  let stageController: StageController;
  let stageDto: StageDto;
  let updatedTranslationStageDto: StageTranslationDto;
  let prisma: PrismaService;

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
      controllers: [StageController, StageTranslationController],
      providers: [
        StageService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        StaticContentService,
        StaticContentRepository,
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

    stageTranslationController = module.get<StageTranslationController>(StageTranslationController);
    stageController = module.get<StageController>(StageController);
    prisma = module.get(PrismaService);
  });

  describe('Update or add stage translation', () => {
    it('should update or add a stage translation', async () => {
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
        kmlFileKey: 'kmlFileKey',
        peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
        familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
        startPoint: [],
        endPoint: [],
      };

      const stageResponse = await stageController.createStage(stageRequest);
      stageDto = Object.assign({}, stageResponse.data);
      const stageTranslationRequest = {
        stageId: stageDto.id,
        localeId: 'de',
        stageHead: 'Kandy',
        stageTail: 'Ella',
        description: 'Dies ist die Wegbeschreibung',
      };

      const expected = {
        stageId: stageDto.id,
        localeId: 'de',
        stageHead: 'Kandy',
        stageTail: 'Ella',
        description: 'Dies ist die Wegbeschreibung',
      };

      const stageTranslationResponse =
        await stageTranslationController.updateStageTranslation(stageTranslationRequest);
      updatedTranslationStageDto = Object.assign({}, stageTranslationResponse.data);
      delete updatedTranslationStageDto.createdAt;
      delete updatedTranslationStageDto.updatedAt;

      expect(updatedTranslationStageDto).toEqual(expect.objectContaining(expected));
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
