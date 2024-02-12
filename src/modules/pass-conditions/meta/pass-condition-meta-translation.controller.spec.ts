import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { JsonResponse } from '@common/types';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
import { PassConditionMetaDto } from './dto/pass-condition-meta.dto';
import { PassConditionMetaController } from './pass-condition-meta-translation.controller';
import { PassConditionMetaService } from './pass-condition-meta-translation.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('PassCondition Meta Controller', () => {
  let app: INestApplication;
  let controller: PassConditionMetaController;
  let prisma: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;
  let mockAuthGuard: AuthGuard;

  const PassConditionMetaTranslationRequest = {
    title: 'title',
    subTitle: 'subTitle',
    description: 'description',
    localeId: 'en',
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
      controllers: [PassConditionMetaController],
      providers: [
        PassConditionMetaService,
        PrismaService,
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
        PassesService,
        UserRepository,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<PassConditionMetaController>(PassConditionMetaController);
    prisma = module.get(PrismaService);

    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Update PassCondition Meta', () => {
    it('should update a PassConditionMetaline', async () => {
      const response = await request(app.getHttpServer())
        .put(`/pass-condition-meta`)
        .send(PassConditionMetaTranslationRequest);

      const expected = {
        data: {
          localeId: 'en',
          title: 'title',
          subTitle: 'subTitle',
          description: 'description',
        },
        statusCode: 200,
      };
      const transformed = response.body as JsonResponse<PassConditionMetaDto>;

      delete transformed.data.createdAt;
      delete transformed.data.updatedAt;

      expect(transformed).toStrictEqual(expected);
    });

    it('should update a PassConditionMetaline', async () => {
      const response = await request(app.getHttpServer()).put(`/pass-condition-meta`).send(null);

      expect(response).toBeDefined();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });
});
