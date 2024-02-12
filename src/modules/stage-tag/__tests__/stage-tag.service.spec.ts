import { PrismaService } from '@prisma-orm/prisma.service';
import { Test } from '@nestjs/testing';
import { StageTagService } from '../stage-tag.service';
import { StageTagDto } from '../dto/stage-tag.dto';
import { StageTagRepository } from '../stage-tag.repository';
import { NotFoundException } from '@nestjs/common';
import { StageTagQueryParamDto } from '../dto/stage-tag-query-params.dto';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagService', () => {
  let prisma: PrismaService;
  let stageTagService: StageTagService;
  let createdStageTag: StageTagDto;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StageTagService,
        PrismaService,
        StageTagRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageTagService = moduleRef.get(StageTagService);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Add a stage tag', () => {
    it('should add a stage tag', async () => {
      const stageTagResponse = await stageTagService.createStageTag();
      createdStageTag = stageTagResponse;

      const expectedCreatedStage = {
        id: createdStageTag.id,
      };

      delete createdStageTag.createdAt;
      delete createdStageTag.updatedAt;

      expect(createdStageTag).toEqual(expectedCreatedStage);
    });
  });

  describe('Get a stage tag', () => {
    it('should get a stage tag', async () => {
      const stageTagResponse = await stageTagService.getStageTag(createdStageTag.id);
      createdStageTag = stageTagResponse;

      const expectedCreatedStage = {
        id: createdStageTag.id,
        stageTagAssociation: [],
        stageTagTranslation: [],
      };

      delete createdStageTag.createdAt;
      delete createdStageTag.updatedAt;

      expect(createdStageTag).toEqual(expectedCreatedStage);
    });

    it('should throw error while getting a stage tag', async () => {
      async function asyncFunctionThatThrowsError() {
        await stageTagService.getStageTag('65b9488c-6eef-496c-8caf-85195a0c7222');
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(NotFoundException);
    });
  });

  describe('Get stage tags', () => {
    it('should get stage tags', async () => {
      const stageTagResponse = await stageTagService.getAllTags(10, 1);
      expect(Array.isArray(stageTagResponse.data)).toBeTruthy();
    });
  });

  describe('Get en stage tags', () => {
    const params: StageTagQueryParamDto = {
      perPage: 10,
      pageNumber: 1,
      stages: 1,
      sortBy: 'name',
    };
    it('should get en stage tags', async () => {
      const stageTagResponse = await stageTagService.getAllTagsEn(params);
      expect(Array.isArray(stageTagResponse.data)).toBeTruthy();
    });
  });

  describe('Update a stage tag', () => {
    it('should update a stage tag', async () => {
      const stageTagResponse = await stageTagService.updateStageTag(createdStageTag.id);
      createdStageTag = stageTagResponse;

      const expectedUpdatedStage = {
        id: createdStageTag.id,
      };

      delete createdStageTag.createdAt;
      delete createdStageTag.updatedAt;

      expect(createdStageTag).toEqual(expectedUpdatedStage);
    });
  });

  describe('Delete a stage tag', () => {
    it('should delete a stage tag', async () => {
      const stageTagResponse = await stageTagService.createStageTag();
      const stageTag: StageTagDto = stageTagResponse;
      const deletedStageTagResponse = await stageTagService.deleteStageTag(stageTag.id);

      expect(deletedStageTagResponse).toEqual(stageTag.id);
    });
  });

  afterAll(async () => {
    await prisma.stageTag.delete({ where: { id: createdStageTag.id } });
    await prisma.$disconnect();
  });
});
