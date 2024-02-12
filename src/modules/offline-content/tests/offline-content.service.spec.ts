import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATIC_CONTENT_PATHS,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { getS3Client } from '@common/helpers';
import { AppConfig } from '@config/app-config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { FAMILY_FRIENDLY_STATUS, PEOPLE_INTERACTIONS } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { StageDto } from '../../../modules/stage/dto/stage.dto';
import { StageController } from '../../../modules/stage/stage.controller';
import { StageRepository } from '../../../modules/stage/stage.repository';
import { StageService } from '../../../modules/stage/stage.service';
import { StaticContentController } from '../../../modules/static-content/static-content.controller';
import { StaticContentRepository } from '../../../modules/static-content/static-content.repository';
import { StaticContentService } from '../../../modules/static-content/static-content.service';
import { CreateStoryDto } from '../../../modules/story/dto/create-story.dto';
import { StoryController } from '../../../modules/story/story.controller';
import { StoryService } from '../../../modules/story/story.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { OfflineContentController } from '../offline-content.controller';
import { OfflineContentService } from '../offline-content.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { StaticContentSignedUrlDto } from '../../../modules/static-content/dto/file-signed-url.dto';
import { faker } from '@faker-js/faker';

describe('OfflineContentService', () => {
  let service: OfflineContentService;
  let stageController: StageController;
  let createdStage: StageDto;
  let staticContentController: StaticContentController;
  let prismaService: PrismaService;
  let s3Client: S3Client;
  const mediaFileName = `${uuidv4()}.mp3`;
  const fileBuffer = Buffer.from('Your file content goes here', 'utf-8');
  let s3AxiosInstance: AxiosInstance;
  let configService: ConfigService;
  let signedUploadedFileName = null;

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: faker.number.int(100),
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
    fileSize: fileBuffer.length,
    contentType: 'audio/mpeg',
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
      controllers: [
        OfflineContentController,
        StageController,
        StoryController,
        StaticContentController,
      ],
      providers: [
        OfflineContentService,
        PrismaService,
        ConfigService,
        StageService,
        StageRepository,
        StoryService,
        StaticContentService,
        StaticContentRepository,
        UserService,
        PassesService,
        UserRepository,
        KeycloakService,

        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    service = module.get<OfflineContentService>(OfflineContentService);
    stageController = module.get<StageController>(StageController);
    staticContentController = module.get<StaticContentController>(StaticContentController);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Client = getS3Client();
    s3AxiosInstance = axios.create();
    configService = module.get<ConfigService>(ConfigService);

    const responseCreateStage = await stageController.createStage(stageRequest);
    const signedUrl = await staticContentController.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStory,
    );

    signedUploadedFileName = signedUrl.uniqueFileName;

    await s3AxiosInstance.put(signedUrl.s3Url, fileBuffer);

    createdStage = Object.assign({}, responseCreateStage.data);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an array of story media', async () => {
    const data: CreateStoryDto = {
      latitude: 1.381938,
      longitude: 1.381938,
      stageStoryTranslations: [
        {
          audioKey: `${STATIC_CONTENT_PATHS.STORY_MEDIA}/${signedUploadedFileName}`,
          localeId: 'en',
          description: 'test',
          title: 'test',
        },
      ],
      stageId: createdStage.id,
    };

    await prismaService.stageStory.create({
      data: {
        longitude: data.longitude,
        latitude: data.latitude,
        stageId: data.stageId,
        stageStoryTranslations: {
          createMany: {
            data: data.stageStoryTranslations,
          },
        },
      },
    });

    const responseResult = await service.findStoryMediaForStage(createdStage.id, 'en');

    expect(responseResult).toBeDefined();
  });
  afterAll(async () => {
    const params = {
      Bucket: configService.get('AWS_BUCKET_NAME'),
      Key: `${STATIC_CONTENT_PATHS.STORY_MEDIA}/${signedUploadedFileName}`,
    };
    await s3Client.send(new DeleteObjectCommand(params));
    await prismaService.stage.delete({ where: { id: createdStage.id } });
  });
});
