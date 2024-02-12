import {
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { AppConfig } from '@config/app-config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { FAMILY_FRIENDLY_STATUS, PEOPLE_INTERACTIONS } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { StageDto } from '../../../modules/stage/dto/stage.dto';
import { StageController } from '../../../modules/stage/stage.controller';
import { StageRepository } from '../../../modules/stage/stage.repository';
import { StageService } from '../../../modules/stage/stage.service';
import { StaticContentController } from '../../../modules/static-content/static-content.controller';
import { StaticContentRepository } from '../../../modules/static-content/static-content.repository';
import { StaticContentService } from '../../../modules/static-content/static-content.service';
import { StoryController } from '../../../modules/story/story.controller';
import { StoryService } from '../../../modules/story/story.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StoryMediaRequestDto } from '../dto/request/story-media-request.dto';
import { OfflineContentController } from '../offline-content.controller';
import { OfflineContentService } from '../offline-content.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { INestApplication } from '@nestjs/common';
import { StaticContentSignedUrlDto } from '@app/modules/static-content/dto/file-signed-url.dto';

describe('OfflineContentController', () => {
  let controller: OfflineContentController;
  let stageController: StageController;
  let createdStage: StageDto;
  let staticContentController: StaticContentController;
  const mediaFileName = `${uuidv4()}.mp3`;
  let prisma: PrismaService;
  let app: INestApplication;

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

  const getSignedUrlRequestForStory: StaticContentSignedUrlDto = {
    fileName: mediaFileName,
    module: STATIC_CONTENT_PATHS.STORY_MEDIA,
    fileSize: 100,
    contentType: 'audio/mpeg',
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [
        OfflineContentController,
        StageController,
        StoryController,
        StaticContentController,
      ],
      providers: [
        OfflineContentService,
        ConfigService,
        PrismaService,
        StageService,
        StageRepository,
        StoryService,
        StaticContentService,
        StaticContentRepository,
        UserService,
        PassesService,
        UserRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<OfflineContentController>(OfflineContentController);
    stageController = module.get<StageController>(StageController);
    staticContentController = module.get<StaticContentController>(StaticContentController);
    prisma = module.get(PrismaService);

    const responseCreateStage = await stageController.createStage(stageRequest);
    await staticContentController.getSignedUrlForStaticMedia(getSignedUrlRequestForStory);

    createdStage = Object.assign({}, responseCreateStage.data);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return an array of story media', async () => {
    const reqParams: StoryMediaRequestDto = {
      stageId: createdStage.id,
    };

    const requestHeaders = {
      headers: {},
    };

    const responseResult = await controller.findStageStoryMediaByStageId(
      reqParams,
      requestHeaders as Request,
    );

    expect(responseResult).toBeDefined();
  });

  afterEach(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
