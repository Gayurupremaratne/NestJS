import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../../../casl/authorization-guard';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { UserRepository } from '../../../user/user.repository';
import { StageTagDto } from '../../dto/stage-tag.dto';
import { PassesService } from '../../../passes/passes.service';
import { StageTagController } from '../../stage-tag.controller';
import { StageTagRepository } from '../../stage-tag.repository';
import { StageTagService } from '../../stage-tag.service';
import { StageTagTranslationDto } from '../dto/stage-tag-translation.dto';
import { StageTagTranslationController } from '../stage-tag-translation.controller';
import { StageTagTranslationRepository } from '../stage-tag-translation.repository';
import { StageTagTranslationService } from '../stage-tag-translation.service';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StageTagTranslationController', () => {
  let app: INestApplication;
  let stageTagTranslationController: StageTagTranslationController;
  let stageTagController: StageTagController;
  let stageTagDto: StageTagDto;
  let updatedTranslationStageTagDto: StageTagTranslationDto;
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
      controllers: [StageTagController, StageTagTranslationController],
      providers: [
        StageTagService,
        PrismaService,
        StageTagRepository,
        StageTagTranslationService,
        StageTagTranslationRepository,
        StaticContentService,
        StaticContentRepository,
        AuthGuard,
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

    stageTagTranslationController = module.get<StageTagTranslationController>(
      StageTagTranslationController,
    );
    stageTagController = module.get<StageTagController>(StageTagController);
    prisma = module.get(PrismaService);
  });

  describe('Update or add stage tag translation', () => {
    it('should update or add a stage tag translation', async () => {
      const stageResponse = await stageTagController.createStageTag();
      stageTagDto = stageResponse.data;

      const stageTagTranslationResponse =
        await stageTagTranslationController.updateStageTagTranslation(
          { stageTagId: stageTagDto.id, localeId: 'en' },
          { name: 'Test tag' },
        );

      const expectedTranslation = {
        stageTagId: stageTagDto.id,
        localeId: 'en',
        name: 'Test tag',
      };
      updatedTranslationStageTagDto = stageTagTranslationResponse.data;
      delete updatedTranslationStageTagDto.createdAt;
      delete updatedTranslationStageTagDto.updatedAt;

      expect(updatedTranslationStageTagDto).toEqual(expectedTranslation);
    });
  });

  afterAll(async () => {
    await prisma.stageTag.delete({ where: { id: stageTagDto.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
