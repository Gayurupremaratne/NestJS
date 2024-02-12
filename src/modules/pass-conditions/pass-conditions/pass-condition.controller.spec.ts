import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { JsonResponse } from '@common/types';
import { ExistsConstraint } from '@common/validators/ExistsConstraint';
import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassConditionTranslation } from '@prisma/client';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { PrismaService } from '../../../prisma/prisma.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { PassConditionTranslationResponse } from './dto/pass-condition-response.dto';
import { UpsertPassConditionTranslationDto } from './dto/upsert-pass-condition-translation.dto';
import { PassConditionController } from './pass-condition.controller';
import { PassConditionService } from './pass-condition.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('Pass Condition Controller', () => {
  let app: INestApplication;
  let passConditionController: PassConditionController;
  let createdPassCondition: PassConditionTranslation[];
  let prisma: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;

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
      controllers: [PassConditionController],
      providers: [
        PassConditionService,
        PrismaService,
        UniqueConstraint,
        ExistsConstraint,
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        StaticContentService,
        StaticContentRepository,
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

    passConditionController = module.get<PassConditionController>(PassConditionController);
    prisma = module.get(PrismaService);

    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(passConditionController).toBeDefined();
  });

  describe('Upsert Pass Condition', () => {
    it('should upsert a Pass Condition', async () => {
      const updatePassConditionRequest: UpsertPassConditionTranslationDto[] = [
        {
          order: 1,
          content: 'sample 1',
          localeId: 'en',
        },
      ];

      const response = await passConditionController.upsertGuidelineTranslation(
        updatePassConditionRequest,
      );

      createdPassCondition = Object.assign([], response.data);

      const expectedContent = {
        order: 1,
        content: 'sample 1',
        localeId: 'en',
      };

      const transformed = response as unknown as JsonResponse<PassConditionTranslation[]>;

      expect(transformed.data[0]).toStrictEqual(expectedContent);
    });
  });

  describe('Get all Pass Condition', () => {
    it('should return all PassCondition', async () => {
      const response = await request(app.getHttpServer()).get(`/pass-conditions`);

      const transformed = response.body as JsonResponse<PassConditionTranslationResponse>;
      const transformedGuideline = transformed.data.passConditions[0];

      expect(response.status).toBe(200);
      expect(transformedGuideline).toHaveProperty('content');
      expect(transformedGuideline).toHaveProperty('localeId');
      expect(transformedGuideline).toHaveProperty('order');
    });
  });

  afterAll(async () => {
    await prisma.passConditionTranslation.delete({
      where: {
        order_localeId: {
          order: createdPassCondition[0].order,
          localeId: createdPassCondition[0].localeId,
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });
});
