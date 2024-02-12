import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { JsonResponse } from '@common/types';
import { ExistsConstraint } from '@common/validators/ExistsConstraint';
import { UniqueConstraint } from '@common/validators/UniqueConstraint';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingGuidelineTranslation } from '@prisma/client';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserRepository } from '../../user/user.repository';
import { OnboardingGuidelineResponse } from './dto/onboarding-guideline-response.dto';
import { UpsertGuidelineTranslationDto } from './dto/upsert-guideline-translation.dto';
import { OnboardingGuidelineController } from './onboarding-guideline.controller';
import { OnboardingGuidelineService } from './onboarding-guideline.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('Onboarding Guideline Controller', () => {
  let app: INestApplication;
  let onboardingController: OnboardingGuidelineController;
  let createdOnboardingGuideline: OnboardingGuidelineTranslation[];
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
      controllers: [OnboardingGuidelineController],
      providers: [
        OnboardingGuidelineService,
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
        PassesService,
        UserRepository,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    onboardingController = module.get<OnboardingGuidelineController>(OnboardingGuidelineController);
    prisma = module.get(PrismaService);

    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(onboardingController).toBeDefined();
  });

  describe('Upsert Onboarding Guideline', () => {
    it('should upsert a Onboarding Guideline', async () => {
      const updateOnboardingGuidelineRequest: UpsertGuidelineTranslationDto[] = [
        {
          order: 1,
          content: 'sample 1',
          localeId: 'en',
        },
      ];

      const response = await onboardingController.upsertGuidelineTranslation(
        updateOnboardingGuidelineRequest,
      );

      createdOnboardingGuideline = Object.assign([], response.data);

      const expectedContent = {
        order: 1,
        content: 'sample 1',
        localeId: 'en',
      };

      const transformed = response as unknown as JsonResponse<OnboardingGuidelineTranslation[]>;

      expect(transformed.data[0]).toStrictEqual(expectedContent);
    });
  });

  describe('Get all Onboarding Guideline', () => {
    it('should return all OnboardingGuideline', async () => {
      const response = await request(app.getHttpServer()).get(`/onboarding-guidelines`);

      const transformed = response.body as JsonResponse<OnboardingGuidelineResponse>;
      const transformedGuideline = transformed.data.onboardingGuidelines[0];

      expect(response.status).toBe(200);
      expect(transformedGuideline).toHaveProperty('content');
      expect(transformedGuideline).toHaveProperty('localeId');
      expect(transformedGuideline).toHaveProperty('order');
    });
  });

  afterAll(async () => {
    await prisma.onboardingGuidelineTranslation.delete({
      where: {
        order_localeId: {
          order: createdOnboardingGuideline[0].order,
          localeId: createdOnboardingGuideline[0].localeId,
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });
});
