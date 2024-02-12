import { Test, TestingModule } from '@nestjs/testing';
import { StageMediaService } from '../stage-media.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateStageMediaDto } from '../dto/create-stage-media.dto';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import { StageMediaUpdateReqParamDto } from '../dto/stage-media-update-req-params.dto';
import { paginator } from '@common/helpers';
import { InternalServerErrorException } from '@nestjs/common';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('StageMediaService', () => {
  let service: StageMediaService;
  const mockReq: CreateStageMediaDto = {
    id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
    userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
    stageId: '',
    mediaKey: 'trail-media/fileName.png',
    type: 'PHOTO',
    mediaType: 'MAIN_IMAGE',
  };

  const updateReqParam: StageMediaUpdateReqParamDto = {
    stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
    mediaId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const authUser = {
    sub: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const paginationOptions = {
    perPage: 10,
    pageNumber: 1,
  };
  const mockPrismaService = {
    stageMedia: {
      findUnique: jest.fn(),
      create: jest.fn(async (data) => {
        if (data.type === 'invalid-type') {
          throw new PrismaClientValidationError('Invalid key error message', null);
        }
        if (data.type === 'duplicate-key') {
          throw new PrismaClientValidationError('Duplicate key error message', null);
        }
        // Return the created media
        return data;
      }),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      paginate: jest.fn(),

      count: jest.fn(),
    },
  };

  const mockService = {
    paginate: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageMediaService,
        PrismaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: paginator, useValue: mockService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    service = module.get<StageMediaService>(StageMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a stage media', async () => {
    const mockRes: CreateStageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaKey: 'trail-media/fileName.png',
      type: 'PHOTO',
      mediaType: 'MAIN_IMAGE',
    };

    mockPrismaService.stageMedia.create.mockResolvedValue(mockRes);

    expect(await service.create(mockReq)).toEqual(mockRes);
  });

  it('should create bulk stage media', async () => {
    const mockRes: CreateStageMediaDto[] = [
      {
        id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        mediaKey: 'trail-media/fileName.png',
        type: 'PHOTO',
        mediaType: 'MAIN_IMAGE',
      },
    ];

    mockPrismaService.stageMedia.createMany.mockResolvedValue(mockRes);

    expect(await service.createBulk([mockReq])).toEqual(mockRes);
  });

  it('should update a stage media', async () => {
    const mockRes: CreateStageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaKey: 'trail-media/fileName.png',
      type: 'PHOTO',
      mediaType: 'MAIN_IMAGE',
    };

    mockPrismaService.stageMedia.update.mockResolvedValue(mockRes);

    expect(await service.update(updateReqParam, mockReq)).toEqual(mockRes);
  });

  it('should delete a stage media', async () => {
    const mockRes: CreateStageMediaDto = {
      id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
      mediaKey: 'trail-media/fileName.png',
      type: 'PHOTO',
      mediaType: 'MAIN_IMAGE',
    };

    mockPrismaService.stageMedia.delete.mockResolvedValue(mockRes);

    expect(await service.remove(updateReqParam.mediaId)).toEqual(mockRes);
  });

  it('should get all  admin media by stage id', async () => {
    const serviceResponse = await service.findAllByStageId(
      updateReqParam.stageId,
      'true',
      paginationOptions.perPage,
      paginationOptions.pageNumber,
    );

    expect(serviceResponse).toHaveProperty('meta');
    expect(serviceResponse).toHaveProperty('data');
  });

  it('should get all hiker media by stage id', async () => {
    const serviceResponse = await service.findAllByStageId(
      updateReqParam.stageId,
      null,
      paginationOptions.perPage,
      paginationOptions.pageNumber,
    );

    expect(serviceResponse).toHaveProperty('meta');
    expect(serviceResponse).toHaveProperty('data');
  });

  it('should return all the stage media by the logged in user', async () => {
    const mockRes: CreateStageMediaDto[] = [
      {
        id: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        stageId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
        mediaKey: 'trail-media/fileName.png',
        type: 'PHOTO',
        mediaType: 'MAIN_IMAGE',
      },
    ];

    mockPrismaService.stageMedia.findMany.mockResolvedValue(mockRes);

    expect(
      await service.getMyStageMedia(updateReqParam.stageId, authUser.sub, 10, 1),
    ).toHaveProperty('meta');

    expect(
      await service.getMyStageMedia(updateReqParam.stageId, authUser.sub, 10, 1),
    ).toHaveProperty('data');
  });

  it('should throw an error in the /me', async () => {
    mockPrismaService.stageMedia.findMany.mockRejectedValue(
      new InternalServerErrorException('test error message'),
    );

    await expect(service.getMyStageMedia(updateReqParam.stageId, '', 10, 1)).rejects.toThrowError(
      'test error message',
    );
  });
});
