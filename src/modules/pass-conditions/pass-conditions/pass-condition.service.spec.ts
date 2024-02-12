import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassConditionTranslation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PassConditionParamDto } from './dto/pass-condition-param.dto';
import { PassConditionDto } from './dto/pass-condition.dto';
import { UpsertPassConditionTranslationDto } from './dto/upsert-pass-condition-translation.dto';
import { PassConditionService } from './pass-condition.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('Pass Condition Translation Service', () => {
  let app: INestApplication;
  let service: PassConditionService;
  let prisma: PrismaService;
  let createdPassCondition: PassConditionTranslation;

  const passconditionTranslationToCreate: UpsertPassConditionTranslationDto[] = [
    {
      content: 'test',
      localeId: 'en',
      order: 1,
    },
  ];

  const passconditionTranslationToCreateRowTwo: UpsertPassConditionTranslationDto[] = [
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
        PassConditionService,
        PrismaService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<PassConditionService>(PassConditionService);
    prisma = module.get(PrismaService);

    const passcondition = await service.upsertPassConditionTranslation(
      passconditionTranslationToCreate,
    );
    createdPassCondition = passcondition[0];

    await service.upsertPassConditionTranslation(passconditionTranslationToCreateRowTwo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('PassCondition Translation Service', () => {
    it('should get all passconditions', async () => {
      const expected: UpsertPassConditionTranslationDto[] = [
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
      const result = await service.getAllPassConditions();
      expect(expected).toStrictEqual(result.passConditions);
    });

    it('should fail to upsert translation', async () => {
      try {
        await service.upsertPassConditionTranslation(null);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should throw on delete non existing record', async () => {
      const invalidPassCondition: PassConditionParamDto = {
        localeId: 'en',
        order: 1000,
      };
      const expected = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to delete pass condition',
      };
      try {
        await service.removePassConditionTranslation(invalidPassCondition);
      } catch (error) {
        expect(error.response).toStrictEqual(expected);
      }
    });

    it('should throw on update non existing record', async () => {
      const expected = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to upsert pass condition',
      };
      try {
        const updatePassConditionData: UpsertPassConditionTranslationDto[] = [
          {
            localeId: 'en',
            content: 'sample 1',
            order: 1,
          },
        ];
        await service.upsertPassConditionTranslation(updatePassConditionData);
      } catch (error) {
        expect(error.response).toStrictEqual(expected);
      }
    });

    it('should get pass conditions by locale and order', async () => {
      const expected = [
        {
          content: 'test',
          localeId: 'en',
          order: 2,
        },
      ];
      const result: PassConditionTranslation[] = await service.getPassConditionsByLocaleAndOrder(
        'en',
        1,
      );
      expect(result).toStrictEqual(expected);
    });

    it('should remove passcondition translation', async () => {
      const result: PassConditionDto =
        await service.removePassConditionTranslation(createdPassCondition);
      expect(result.localeId).toStrictEqual(createdPassCondition.localeId);
      expect(result.order).toStrictEqual(createdPassCondition.order);
    });
  });

  afterAll(async () => {
    await prisma.passConditionTranslation.delete({
      where: {
        order_localeId: {
          localeId: createdPassCondition.localeId,
          order: createdPassCondition.order,
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });
});
