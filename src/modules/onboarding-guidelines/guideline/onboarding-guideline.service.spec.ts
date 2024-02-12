import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingGuidelineTranslation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GuidelineTranslationParamDto } from './dto/onboarding-guideline-param.dto';
import { UpsertGuidelineTranslationDto } from './dto/upsert-guideline-translation.dto';
import { OnboardingGuidelineService } from './onboarding-guideline.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('Guideline Translation Service', () => {
  let app: INestApplication;
  let service: OnboardingGuidelineService;
  let prisma: PrismaService;
  let createdGuideline: OnboardingGuidelineTranslation;

  const guidelineTranslationToCreate: UpsertGuidelineTranslationDto[] = [
    {
      content: 'test',
      localeId: 'en',
      order: 1,
    },
  ];

  const guidelineTranslationToCreateRowTwo: UpsertGuidelineTranslationDto[] = [
    {
      content: 'test',
      localeId: 'en',
      order: 2,
    },
  ];

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingGuidelineService,
        PrismaService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<OnboardingGuidelineService>(OnboardingGuidelineService);
    prisma = module.get(PrismaService);

    const guideline = await service.upsertGuidelineTranslation(guidelineTranslationToCreate);
    createdGuideline = guideline[0];

    await service.upsertGuidelineTranslation(guidelineTranslationToCreateRowTwo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Guideline Translation Service', () => {
    it('should get all guidelines', async () => {
      const expected: UpsertGuidelineTranslationDto[] = [
        {
          content: 'test',
          localeId: 'en',
          order: 1,
        },
        {
          content: 'test',
          localeId: 'en',
          order: 2,
        },
      ];
      const result = await service.getAllGuidelineTranslations();
      expect(expected).toStrictEqual(result.onboardingGuidelines);
    });

    it('should failed to upsert guidlines translations', async () => {
      try {
        await service.upsertGuidelineTranslation(null);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw on delete non existing record', async () => {
      const invalidGuidelineParams: GuidelineTranslationParamDto = {
        localeId: 'en',
        order: 1000,
      };
      const expected = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to delete onboarding guideline',
      };
      try {
        await service.removeGuidelineTranslation(invalidGuidelineParams);
      } catch (error) {
        expect(error.response).toStrictEqual(expected);
      }
    });

    it('should get guidelines by locale and order', async () => {
      const expected = [
        {
          content: 'test',
          localeId: 'en',
          order: 2,
        },
      ];
      const result: OnboardingGuidelineTranslation[] = await service.getGuidelinesByLocaleAndOrder(
        'en',
        1,
      );
      expect(result).toStrictEqual(expected);
    });

    it('should remove guideline translation', async () => {
      const result = await service.removeGuidelineTranslation(createdGuideline);
      expect(result.order).toBe(createdGuideline.order);
      expect(result.localeId).toBe(createdGuideline.localeId);
    });
  });

  afterAll(async () => {
    await prisma.onboardingGuidelineTranslation.delete({
      where: {
        order_localeId: {
          order: createdGuideline.order,
          localeId: createdGuideline.localeId,
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });
});
