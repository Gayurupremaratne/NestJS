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
import { StageTagDto } from '../dto/stage-tag.dto';
import { StageTagController } from '../stage-tag.controller';
import { StageTagRepository } from '../stage-tag.repository';
import { StageTagService } from '../stage-tag.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagController', () => {
  let app: INestApplication;
  let stageTagController: StageTagController;
  let stageTagDto: StageTagDto;
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
      controllers: [StageTagController],
      providers: [
        StageTagService,
        PrismaService,
        StageTagRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        UserRepository,
        PassesService,
        KeycloakService,
        StaticContentService,
        StaticContentRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageTagController = module.get<StageTagController>(StageTagController);
    prisma = module.get(PrismaService);
  });

  describe('Add a stage tag', () => {
    it('should add a stage tag', async () => {
      const stageTagResponse = await stageTagController.createStageTag();
      stageTagDto = stageTagResponse.data;

      const expectedCreatedStage = {
        id: stageTagDto.id,
      };

      delete stageTagDto.createdAt;
      delete stageTagDto.updatedAt;

      expect(stageTagDto).toEqual(expectedCreatedStage);
    });
  });

  describe('Get a stage tag', () => {
    it('should get a stage tag', async () => {
      const stageTagResponse = await stageTagController.getStageTag({ id: stageTagDto.id });
      stageTagDto = stageTagResponse.data;

      const expectedCreatedStage = {
        id: stageTagDto.id,
        stageTagAssociation: [],
        stageTagTranslation: [],
      };

      delete stageTagDto.createdAt;
      delete stageTagDto.updatedAt;

      expect(stageTagDto).toEqual(expectedCreatedStage);
    });
  });

  describe('Get stage tags', () => {
    it('should get stage tags', async () => {
      const stageTagResponse = await stageTagController.getAllTags({
        perPage: 10,
        pageNumber: 1,
      });
      expect(Array.isArray(stageTagResponse.data.data)).toBeTruthy();
    });

    it('should get stage tags with all param', async () => {
      const stageTagResponse = await stageTagController.getAllTags({
        perPage: 10,
        pageNumber: 1,
        stages: 'all',
      });
      expect(Array.isArray(stageTagResponse.data.data)).toBeTruthy();
    });

    it('should get en stage tags with all param and sorting', async () => {
      const stageTagResponse = await stageTagController.getAllTagsEn({
        perPage: 10,
        pageNumber: 1,
        stages: 'all',
        sortBy: '-name',
      });
      expect(Array.isArray(stageTagResponse.data.data)).toBeTruthy();
    });

    it('should get stage tags with stage number', async () => {
      const stageTagResponse = await stageTagController.getAllTags({
        perPage: 10,
        pageNumber: 1,
        stages: 1,
      });
      expect(Array.isArray(stageTagResponse.data.data)).toBeTruthy();
    });
  });

  describe('Update a stage tag', () => {
    it('should update a stage tag', async () => {
      const stageTagResponse = await stageTagController.updateStageTag({ id: stageTagDto.id });
      stageTagDto = stageTagResponse.data;

      const expectedUpdatedStage = {
        id: stageTagDto.id,
      };

      delete stageTagDto.createdAt;
      delete stageTagDto.updatedAt;

      expect(stageTagDto).toEqual(expectedUpdatedStage);
    });
  });

  describe('Delete a stage tag', () => {
    it('should delete a stage tag', async () => {
      const stageTagResponse = await stageTagController.createStageTag();
      const stageTag: StageTagDto = stageTagResponse.data;
      const deletedStageTagResponse = await stageTagController.deleteStageTag({
        id: stageTag.id,
      });

      expect(deletedStageTagResponse.data).toEqual(stageTag.id);
    });
  });

  afterAll(async () => {
    await prisma.stageTag.delete({ where: { id: stageTagDto.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
