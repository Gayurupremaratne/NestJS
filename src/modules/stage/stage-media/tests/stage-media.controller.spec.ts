import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '@user/user.service';
import { MockAuthGuard } from '../../../../common/mock-modules/auth.guard.mock';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthGuard } from '../../../casl/authorization-guard';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { UserRepository } from '../../../user/user.repository';
import { PassesService } from '../../../passes/passes.service';
import { CreateStageMediaBulkDto } from '../dto/create-stage-media-bulk.dto';
import { CreateStageMediaDto } from '../dto/create-stage-media.dto';
import { StageMediaDeleteReqParamDto } from '../dto/stage-media-delete-req-params.dto';
import { StageMediaReqParamDto } from '../dto/stage-media-req-param.dto';
import { StageMediaUpdateReqParamDto } from '../dto/stage-media-update-req-params.dto';
import { StageMediaDto } from '../dto/stage-media.dto';
import { StageMediaController } from '../stage-media.controller';
import { StageMediaService } from '../stage-media.service';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageMediaController', () => {
  let controller: StageMediaController;

  const reqHeaders: StageMediaReqParamDto = {
    stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const reqUpdateHeaders: StageMediaUpdateReqParamDto = {
    stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
    mediaId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const reqDeleteHeaders: StageMediaDeleteReqParamDto = {
    mediaId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const authUser = {
    sub: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const paginationOptions = {
    perPage: 10,
    pageNumber: 1,
  };

  const mockService = {
    create: jest.fn(),
    createBulk: jest.fn(),
    findAllByStageId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMyStageMedia: jest.fn(),
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
      controllers: [StageMediaController],
      providers: [
        StageMediaService,
        PrismaService,
        { provide: StageMediaService, useValue: mockService },
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

    controller = module.get<StageMediaController>(StageMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a stage media via mobile', async () => {
    const mockReq: CreateStageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      type: 'PHOTO',
      mediaKey: 'trail-media/fileName.png',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaType: 'MAIN_IMAGE',
    };

    const reqBody: CreateStageMediaDto = {
      type: 'PHOTO',
      mediaKey: 'fileName',
      userId: '',
      stageId: '',
      mediaType: 'MAIN_IMAGE',
    };

    mockService.create.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.create(reqHeaders, reqBody, authUser);
    expect(responseFromController).toBeDefined();
  });

  it('should create a stage media via web', async () => {
    const mockReq: CreateStageMediaBulkDto = {
      mediaKeys: [
        {
          id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
          type: 'PHOTO',
          mediaKey: 'trail-media/fileName.png',
          userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
          stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
          mediaType: 'MAIN_IMAGE',
        },
      ],
    };
    const reqBody: CreateStageMediaBulkDto = {
      mediaKeys: [
        {
          type: 'PHOTO',
          mediaKey: 'fileName',
          userId: '',
          stageId: '',
          mediaType: 'MAIN_IMAGE',
        },
      ],
    };
    mockService.createBulk.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.createWebBulk(reqHeaders, reqBody, authUser);

    expect(responseFromController).toBeDefined();
  });

  it('should get all stage media', async () => {
    const mockReq: StageMediaDto[] = [
      {
        id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        type: 'PHOTO',
        mediaKey: 'trail-media/fileName.png',
        userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        mediaType: 'MAIN_IMAGE',
      },
    ];

    mockService.findAllByStageId.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.findallByStageId(
      reqHeaders,
      'true',
      paginationOptions.perPage,
      paginationOptions.pageNumber,
    );

    expect(responseFromController).toBeDefined();
  });

  it('should return all the stage media by the logged in user', async () => {
    const mockReq: StageMediaDto[] = [
      {
        id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        type: 'PHOTO',
        mediaKey: 'trail-media/fileName.png',
        userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        mediaType: 'MAIN_IMAGE',
      },
    ];

    mockService.findAllByStageId.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.getMyStageMedia(
      reqHeaders,
      paginationOptions.perPage,
      paginationOptions.pageNumber,
      authUser,
    );

    expect(responseFromController).toBeDefined();
  });

  it('should update a stage media', async () => {
    const mockReq: StageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      type: 'PHOTO',
      mediaKey: 'trail-media/fileName.png',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaType: 'MAIN_IMAGE',
    };

    const reqBody: StageMediaDto = {
      type: 'PHOTO',
      mediaKey: 'fileName',
      userId: '',
      stageId: '',
      mediaType: 'MAIN_IMAGE',
    };

    mockService.create.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.update(reqUpdateHeaders, reqBody, authUser);

    expect(responseFromController).toBeDefined();
  });

  it('should delete a stage media', async () => {
    const mockReq: StageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      type: 'PHOTO',
      mediaKey: 'trail-media/fileName.png',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaType: 'MAIN_IMAGE',
    };

    mockService.remove.mockReturnValueOnce(mockReq);
    const responseFromController = await controller.remove(reqDeleteHeaders);

    expect(responseFromController).toBeDefined();
  });
});
