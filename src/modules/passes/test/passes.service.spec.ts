import {
  DATE_FORMATS,
  PASS_USER_TYPE,
  PASS_USER_TYPE_CODE,
  PASS_VALIDITY_PERIOD,
  PLATFORM,
  PassType,
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { paginator } from '@common/helpers';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import {
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import {
  FAMILY_FRIENDLY_STATUS,
  PEOPLE_INTERACTIONS,
  PassInventoryAggregateView,
  Passes,
  UserTrailTracking,
} from '@prisma/client';
import { Queue } from 'bull';
import moment from 'moment';
import { MailService } from '../../../modules/mail/mail.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { GetPassDto, PassesEntity } from '../dto';
import { PassesService } from '../passes.service';

describe('PassesService', () => {
  let service: PassesService;
  const findUniqueStageMockRes = {
    passes: [
      { id: '9af558ce-7979-441a-a990-7a920345a59c' },
      { id: '36e4a360-0e50-477e-bd05-17db23d4ad68' },
    ],
    distance: 10,
    estimatedDuration: 330,
    number: 2,
    difficultyType: 'BEGINNER',
    openTime: '1970-01-01T02:30:00.000Z',
    closeTime: '1970-01-01T06:30:00.000Z',
    elevationGain: 0,
    stagesTranslation: [
      { stageHead: 'Galaha', stageTail: 'Loolecondera', localeId: 'en' },
      { stageHead: 'Galaha', stageTail: 'Loolecondera', localeId: 'fr' },
    ],
  };

  const mockPrismaService = {
    passes: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      paginate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
    },
    orders: {
      findUnique: jest.fn(),
    },
    stage: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    passInventoryAggregateView: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    passOrdersAggregateView: {
      findMany: jest.fn(),
      paginate: jest.fn(),
      count: jest.fn(),
    },
    userTrailTracking: {
      findFirst: jest.fn(),
    },
    userTrailTrackingHistory: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $extends: jest.fn().mockImplementation(() => {
      return {
        passOrdersAggregateView: {
          findMany: jest.fn().mockResolvedValue(prismaAggregateMockRes),
          count: jest.fn(),
        },
        stage: {
          findUnique: jest.fn().mockResolvedValue(findUniqueStageMockRes),
        },
      };
    }),
    paginate: jest.fn(),
  };
  const mockService = {
    paginate: jest.fn(),
  };

  const mockUserId = 'myUserId';
  const mockToUserId = 'toUserId';
  const mockPassId = 'myPassId';
  const mockAmendDate = new Date('2023-01-20');
  const mockStageId = 'myStageId';
  const mockOrderId = 'myOrderId';

  const mockStageReq = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    number: 1,
    cumulativeReviews: 0,
    reviewsCount: 0,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
    stagesTranslation: [
      {
        stageHead: 'test',
        stageTail: 'test',
      },
    ],
  };

  const mockRes: Passes = {
    id: '3829cnd9',
    stageId: '2903canc032',
    userId: mockUserId,
    orderId: 'myOrderId',
    activated: false,
    reservedFor: moment(moment().format(DATE_FORMATS.YYYYMMDD)).toDate(),
    isCancelled: false,
    isTransferred: false,
    type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
    expiredAt: moment().endOf('day').toDate(),
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: null,
    passId: 1234,
  };

  const prismaTransactionMock = {
    $transaction: jest.fn().mockImplementation((callback) => callback(prismaTransactionMock)),
    passes: {
      update: jest.fn().mockReturnValue({
        ...mockRes,
        isTransferred: true,
        userId: mockToUserId,
        activated: true,
      }),
    },
    userTrailTracking: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const prismaAggregateMockRes = [
    {
      orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
      userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
      stageId: '37114663-211d-4c35-a105-5ab61ed5285c',
      reservedFor: '2023-08-21T00:00:00.000Z',
      passCount: 2,
      status: PassType.ACTIVE,
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
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        PassesService,
        PrismaService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        ConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: paginator, useValue: mockService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    service = module.get<PassesService>(PassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('should do the necessary check before transferring a pass', () => {
    it('when data is correct', async () => {
      mockPrismaService.passes.findUnique.mockResolvedValue(mockRes);
      const res = await service.transferPassValidation(
        '323829cnd983',
        mockToUserId,
        mockUserId,
        mockRes,
      );
      expect(res).toBe(true);
    });

    it('when activated is set to true', async () => {
      const mocResOther: Passes = {
        ...mockRes,
        activated: true,
      };
      mockPrismaService.passes.findUnique.mockResolvedValue(mocResOther);
      const res = await service.transferPassValidation(
        '323829cnd983',
        mockToUserId,
        mockUserId,
        mocResOther,
      );
      expect(res).toBe(false);
    });

    it('when cancelled is set to true', async () => {
      const mocResOther: Passes = {
        ...mockRes,
        isCancelled: true,
      };
      mockPrismaService.passes.findUnique.mockResolvedValue(mocResOther);
      const res = await service.transferPassValidation(
        '323829cnd983',
        mockToUserId,
        mockUserId,
        mocResOther,
      );
      expect(res).toBe(false);
    });

    it('when both the user ids are same', async () => {
      const mocResOther: Passes = {
        ...mockRes,
      };
      mockPrismaService.passes.findUnique.mockResolvedValue(mocResOther);
      const res = await service.transferPassValidation(
        '323829cnd983',
        mockUserId,
        mockUserId,
        mocResOther,
      );
      expect(res).toBe(false);
    });

    it('when the reserved for date is changed to a past date', async () => {
      const mocResOther: Passes = {
        ...mockRes,
        reservedFor: moment().subtract(15, 'day').toDate(),
        expiredAt: moment().subtract(15, 'day').endOf('day').toDate(),
      };
      mockPrismaService.passes.findUnique.mockResolvedValue(mocResOther);
      const res = await service.transferPassValidation(
        '323829cnd983',
        mockToUserId,
        mockUserId,
        mocResOther,
      );
      expect(res).toBe(false);
    });

    it('when the reserved for date is changed for a future date', async () => {
      const mocResOther: Passes = {
        ...mockRes,
        reservedFor: moment().add(1, 'day').toDate(),
      };
      mockPrismaService.passes.findUnique.mockResolvedValue(mocResOther);
      const res = await service.transferPassValidation(
        '323829cnd983',
        'toUserId',
        mockUserId,
        mocResOther,
      );
      expect(res).toBe(true);
    });
  });

  describe('should do a bulk create for passes', () => {
    const mockBulkPasses = { ...mockRes };
    it('create passes method', async () => {
      const mockRes = {
        count: 1,
      };

      mockPrismaService.passes.createMany.mockResolvedValue(mockRes);
      const res = await service.createPasses([mockBulkPasses]);
      expect(res).toBe(mockRes);
      expect(res).toHaveProperty('count');
    });

    it('should throw an exception on error', async () => {
      const passesData = [];

      const createManySpy = jest.spyOn(mockPrismaService.passes, 'createMany');
      createManySpy.mockRejectedValue(new Error('Test error'));

      await expect(service.createPasses(passesData)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('should transfer a pass to the other user', () => {
    it('transfer pass method', async () => {
      const res: PassesEntity = {
        ...mockRes,
        isTransferred: true,
        userId: mockToUserId,
        activated: true,
      };

      const passSpy = jest.spyOn(mockPrismaService.passes, 'findFirst');
      const trailTrackSpy = jest.spyOn(mockPrismaService.userTrailTracking, 'findFirst');
      passSpy.mockResolvedValue(res);
      trailTrackSpy.mockResolvedValue(null);
      jest.spyOn(service, 'transferPassValidation').mockResolvedValue(true);

      jest
        .spyOn(mockPrismaService, '$transaction')
        .mockImplementation((callback) => callback(prismaTransactionMock));

      const result = await service.transferPass(mockPassId, mockToUserId);
      expect(result).toStrictEqual(res);
    });

    it('transfer pass method with trail traking history', async () => {
      const res: PassesEntity = {
        ...mockRes,
        isTransferred: true,
        userId: mockToUserId,
        activated: true,
      };

      const trailTracingHistory: UserTrailTracking = {
        userId: mockUserId,
        passesId: mockPassId,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        averagePace: 0,
        averageSpeed: 0,
        distanceTraveled: 0,
        elevationGain: 0,
        elevationLoss: 0,
        latitude: 0,
        longitude: 0,
        totalTime: 0,
        startTime: undefined,
        timestamp: undefined,
        completion: 0,
        isActiveTrack: false,
      };

      const passSpy = jest.spyOn(mockPrismaService.passes, 'findFirst');
      const trailTrackSpy = jest.spyOn(mockPrismaService.userTrailTracking, 'findFirst');
      const trailTrackHistorySpy = jest.spyOn(
        mockPrismaService.userTrailTrackingHistory,
        'updateMany',
      );
      passSpy.mockResolvedValue(res);
      trailTrackSpy.mockResolvedValue(trailTracingHistory);
      trailTrackHistorySpy.mockResolvedValue(null);

      jest.spyOn(service, 'transferPassValidation').mockResolvedValue(true);

      jest
        .spyOn(mockPrismaService, '$transaction')
        .mockImplementation((callback) => callback(prismaTransactionMock));

      const result = await service.transferPass(mockPassId, mockToUserId);
      expect(result).toStrictEqual(res);
    });

    it('should throw an InternalServerErrorException on error', async () => {
      const passId = 'passId123';
      const userId = 'userId456';

      const transactionMock = { ...prismaTransactionMock };

      transactionMock.passes.update = jest.fn().mockRejectedValue(new Error('Test error'));

      jest
        .spyOn(mockPrismaService, '$transaction')
        .mockImplementation((callback) => callback(transactionMock));

      await expect(service.transferPass(passId, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw an BadRequestException on error', async () => {
      const passId = 'passId123';
      const userId = mockUserId;

      await expect(service.transferPass(passId, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('should get all passes relevant to a user', () => {
    it('should throw an exception if platform is mobile and type is missing', async () => {
      const data: GetPassDto = {
        pageNumber: 1,
        perPage: 10,
      };
      const platform = PLATFORM.mobile;

      await expect(service.findAllByUser(data, mockUserId, platform)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should return passes with proper structure when platform is mobile ', async () => {
      const data: GetPassDto = {
        pageNumber: 1,
        perPage: 10,
        type: PassType.ACTIVE,
      };

      const res = {
        data: [
          {
            orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
            userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
            stageId: '37114663-211d-4c35-a105-5ab61ed5285c',
            reservedFor: '2023-08-21T00:00:00.000Z',
            passCount: 2,
            status: PassType.ACTIVE,
            stageData: {
              passes: [
                {
                  id: '9af558ce-7979-441a-a990-7a920345a59c',
                },
                {
                  id: '36e4a360-0e50-477e-bd05-17db23d4ad68',
                },
              ],
              distance: 10,
              estimatedDuration: 330,
              number: 2,
              difficultyType: 'BEGINNER',
              openTime: '1970-01-01T02:30:00.000Z',
              closeTime: '1970-01-01T06:30:00.000Z',
              elevationGain: 0,
              stagesTranslation: [
                {
                  stageHead: 'Galaha',
                  stageTail: 'Loolecondera',
                  localeId: 'en',
                },
                {
                  stageHead: 'Galaha',
                  stageTail: 'Loolecondera',
                  localeId: 'fr',
                },
              ],
            },
          },
        ],
        meta: {
          lastPage: NaN,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      const platform = PLATFORM.mobile;

      const response = await service.findAllByUser(data, mockUserId, platform);
      expect(response).toMatchObject(res);
    });

    it('should return passes with proper structure when platform is web ', async () => {
      const data: GetPassDto = {
        pageNumber: 1,
        perPage: 10,
      };

      const mockFindUniqueResponse = {
        number: 3,
        stagesTranslation: [
          {
            stageHead: 'Loolecondera',
            stageTail: 'Thawalanthenna',
            localeId: 'en',
          },
        ],
      };

      const res = {
        data: [
          {
            orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
            userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
            stageId: '37114663-211d-4c35-a105-5ab61ed5285c',
            reservedFor: '2023-08-21T00:00:00.000Z',
            passCount: 2,
            stageData: {
              number: 3,
              stagesTranslation: [
                {
                  stageHead: 'Loolecondera',
                  stageTail: 'Thawalanthenna',
                  localeId: 'en',
                },
              ],
            },
          },
        ],
        meta: {
          lastPage: NaN,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      const platform = PLATFORM.web;
      jest.spyOn(mockPrismaService, '$extends').mockImplementation(() => {
        return {
          passOrdersAggregateView: {
            findMany: jest.fn().mockResolvedValue(prismaAggregateMockRes),
            count: jest.fn(),
          },
          stage: {
            findUnique: jest.fn().mockResolvedValue(mockFindUniqueResponse),
          },
        };
      });
      const response = await service.findAllByUser(data, mockUserId, platform);
      expect(response).toMatchObject(res);
    });
  });

  describe('should get all users trails past and scheduled', () => {
    const data: GetPassDto = {
      pageNumber: 1,
      perPage: 10,
    };

    it('should throw an exception when pass type is active', async () => {
      const mockDtoData = {
        ...data,
        type: PassType.ACTIVE,
      };
      await expect(service.getMyTrails(mockUserId, mockDtoData)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should return the proper data when pass type is expired', async () => {
      const mockDtoData = {
        ...data,
        type: PassType.EXPIRED,
      };
      const mockFindManyResponse = [
        {
          reservedFor: '2023-08-21T00:00:00.000Z',
          stage: {
            number: 2,
            badge: {
              badgeKey: 'badge-media/de6d1be7-ca25-4c50-9303-0564ac78e792-icon.jpeg',
            },
            stageMedia: [
              {
                mediaKey: 'badge-media/4bed635c-ef78-46b6-96da-68f413757ddd-icon.jpeg',
              },
            ],
            stagesTranslation: [
              {
                stageHead: 'Galaha',
                stageTail: 'Loolecondera',
                localeId: 'en',
              },
              {
                stageHead: 'Galaha',
                stageTail: 'Loolecondera',
                localeId: 'fr',
              },
            ],
          },
        },
      ];

      const mockServiceClassResponse = {
        data: [mockFindManyResponse[0]],
        meta: {
          total: undefined,
          lastPage: NaN,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      mockPrismaService.passes.findMany.mockResolvedValue(mockFindManyResponse);
      const response = await service.getMyTrails(mockUserId, mockDtoData);
      expect(response).toMatchObject(mockServiceClassResponse);
    });

    it('should return the proper data when pass is reserved', async () => {
      const mockDtoData = {
        ...data,
        type: PassType.RESERVED,
      };

      const mockPrismaAggregateRes = [
        {
          orderId: 'b13c4f3f-1874-48fe-8e49-9a1573f1219a',
          userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          stageId: '6831a73d-ecb1-4595-8f69-8017f15cbfc7',
          reservedFor: '2023-08-26T00:00:00.000Z',
          passCount: 1,
        },
      ];

      const mockFindUniqueResponse = {
        number: 3,
        difficultyType: 'MODERATE',
        stagesTranslation: [
          {
            stageHead: 'Loolecondera',
            stageTail: 'Thawalanthenna',
            localeId: 'en',
          },
        ],
        stageMedia: [],
      };

      const mockServiceResponse = {
        data: [
          {
            orderId: 'b13c4f3f-1874-48fe-8e49-9a1573f1219a',
            userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
            stageId: '6831a73d-ecb1-4595-8f69-8017f15cbfc7',
            reservedFor: '2023-08-26T00:00:00.000Z',
            passCount: 1,
            stageData: {
              number: 3,
              difficultyType: 'MODERATE',
              stagesTranslation: [
                {
                  stageHead: 'Loolecondera',
                  stageTail: 'Thawalanthenna',
                  localeId: 'en',
                },
              ],
              stageMedia: [],
            },
          },
        ],
        meta: {
          total: undefined,
          lastPage: NaN,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      mockPrismaService.passOrdersAggregateView.findMany.mockResolvedValue(mockPrismaAggregateRes);
      mockPrismaService.stage.findUnique.mockResolvedValue(mockFindUniqueResponse);
      const response = await service.getMyTrails(mockUserId, mockDtoData);
      expect(response).toMatchObject(mockServiceResponse);
    });
  });

  describe('Get active pass of a user by stage', () => {
    it('should return the active pass of a user by stage', async () => {
      const mockRes = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: false,
          isTransferred: false,
          reservedFor: new Date(),
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          userTrailTracking: null,
          passValidity: PASS_VALIDITY_PERIOD,
        },
      ];

      jest.spyOn(mockPrismaService.passes, 'findMany').mockResolvedValue(mockRes);
      const result = await service.getUserActivePassByStageId(mockUserId, mockStageId);
      expect(result).toBeDefined();
    });

    it('should return the active pass of a user by stage with trail tracking', async () => {
      const mockRes = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: false,
          isTransferred: false,
          reservedFor: new Date(),
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          userTrailTracking: { isCompleted: false },
          passValidity: PASS_VALIDITY_PERIOD,
        },
      ];

      jest.spyOn(mockPrismaService.passes, 'findMany').mockResolvedValue(mockRes);
      const result = await service.getUserActivePassByStageId(mockUserId, mockStageId);
      expect(result).toBeDefined();
    });

    it('should return empty for no active pass since trail is completed', async () => {
      const mockResWithCompletedTracking = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: false,
          isTransferred: false,
          reservedFor: new Date(),
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          userTrailTracking: { isCompleted: true },
          passValidity: PASS_VALIDITY_PERIOD,
        },
      ];

      jest
        .spyOn(mockPrismaService.passes, 'findMany')
        .mockResolvedValue(mockResWithCompletedTracking);

      const result = await service.getUserActivePassByStageId(mockUserId, mockStageId);
      expect(result).toBeDefined();
    });

    it('should return error for stage not', async () => {
      const userId = 'userId123';

      jest.spyOn(mockPrismaService.stage, 'findUnique').mockResolvedValue(null); // Mocking that stage does not exist

      jest
        .spyOn(mockPrismaService.passes, 'findMany')
        .mockRejectedValue(new Error('Stage not found'));

      try {
        await service.getUserActivePassByStageId(userId, mockStageId);
        // If the service call does not throw an error, fail the test
        fail('Expected an NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Stage not found');
      }
    });

    it('should return error no passes found for the given user and stage', async () => {
      const userId = 'userId123';

      jest.spyOn(mockPrismaService.stage, 'findUnique').mockResolvedValue({});

      jest.spyOn(mockPrismaService.passes, 'findMany').mockResolvedValue([]);

      const result = await service.getUserActivePassByStageId(userId, mockStageId);
      expect(result).toBeDefined();
    });

    it('should throw an exception on error', async () => {
      const mockFindUniqueResponseNew = {
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        number: 4,
        stagesTranslation: [
          {
            stageHead: 'Loolecondera',
            stageTail: 'Thawalanthenna',
            localeId: 'en',
          },
        ],
      };

      const stageId = 'stageId';
      const userId = 'userId456';

      jest.spyOn(mockPrismaService, '$extends').mockImplementation(() => {
        return {
          passOrdersAggregateView: {
            findMany: jest.fn().mockResolvedValue(prismaAggregateMockRes),
            count: jest.fn(),
          },
          stage: {
            findUnique: jest.fn().mockRejectedValue(mockFindUniqueResponseNew),
          },
        };
      });

      // const stageSpy = jest.spyOn(mockPrismaService.stage, 'findUnique');
      // stageSpy.mockResolvedValue(new Error('Test error'));
      const getActivePassSpy = jest.spyOn(mockPrismaService.passes, 'findMany');
      getActivePassSpy.mockRejectedValue(new Error('Test error'));

      await expect(service.getUserActivePassByStageId(userId, stageId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Get passes for notices', () => {
    it('should get all passes by stage for email notice', async () => {
      const cursor = 0;
      mockPrismaService.passes.findMany.mockResolvedValue(mockRes);
      const orderResponse = await service.getAllPassesUserIdByStage(
        prismaAggregateMockRes[0].stageId,
        cursor,
      );

      expect(orderResponse).toBeDefined();
    });

    it('should get all passes by stage for notification notice', async () => {
      const cursor = 0;
      mockPrismaService.passes.findMany.mockResolvedValue(mockRes);
      const orderResponse = await service.getAllPassesUserIdByStage(
        prismaAggregateMockRes[0].stageId,
        cursor,
      );

      expect(orderResponse).toBeDefined();
    });

    it('should throw error for invalid stage', async () => {
      try {
        const cursor = 0;
        await service.getAllPassesUserIdByStage(null, cursor);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Delete passes', () => {
    it('should soft delete a pass', async () => {
      const res: PassesEntity[] = [
        {
          ...mockRes,
          isTransferred: true,
          userId: mockToUserId,
          activated: true,
          isCancelled: true,
          cancelledAt: new Date(),
        },
      ];

      const mockUser = {
        email: 'test@mail.com',
      };

      const mockOrderDetails = {
        passes: [],
      };

      const findUniqueStage = jest.spyOn(mockPrismaService.stage, 'findFirst');
      const updateSpy = jest.spyOn(mockPrismaService.passes, 'updateMany');
      const findUniqueSpy = jest.spyOn(mockPrismaService.passes, 'findMany');
      const findUniqueSpyUser = jest.spyOn(mockPrismaService.user, 'findUniqueOrThrow');
      const findUniqueSpyOrder = jest.spyOn(mockPrismaService.orders, 'findUnique');

      findUniqueStage.mockResolvedValueOnce(mockStageReq);
      updateSpy.mockResolvedValue(res);
      findUniqueSpy.mockResolvedValue(res);
      findUniqueSpyUser.mockResolvedValue(mockUser);
      findUniqueSpyOrder.mockResolvedValue(mockOrderDetails);
      const result = await service.softDeletePass(mockPassId, mockUserId);
      expect(result).toEqual(res);
    });

    it('should throw an exception on error for soft delete a pass', async () => {
      const passId = 'passId123';
      const userId = 'userId456';

      const updateSpy = jest.spyOn(mockPrismaService.passes, 'updateMany');
      updateSpy.mockRejectedValue(new Error('Test error'));

      await expect(service.softDeletePass(passId, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Amend passes test cases', () => {
    it('amend pass method', async () => {
      const currentDate = moment().format(DATE_FORMATS.YYYYMMDD);
      const daysFromReserved = moment(currentDate).add(10, 'days').format(DATE_FORMATS.YYYYMMDD);
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: false,
        isTransferred: false,
        reservedFor: daysFromReserved,
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
      };

      const mockAggregateRes: PassInventoryAggregateView = {
        stage_id: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        date: new Date(),
        inventoryQuantity: 100,
        reservedQuantity: 0,
        cancelledQuantity: 0,
      };
      jest.spyOn(mockPrismaService.passes, 'update').mockResolvedValue(mockRes);
      jest.spyOn(mockPrismaService.passes, 'findUnique').mockResolvedValue(mockRes);
      jest.spyOn(mockPrismaService.passes, 'findMany').mockResolvedValue([mockRes]);
      jest.spyOn(mockPrismaService.stage, 'findFirst').mockResolvedValue(mockStageReq);
      const updateSpy = jest.spyOn(mockPrismaService.passInventoryAggregateView, 'findFirst');
      updateSpy.mockResolvedValue(mockAggregateRes);
      const result = await service.amendPass(mockOrderId, mockAmendDate, mockStageId, mockUserId);
      expect(result).toBeDefined();
    });

    it('should throw an error when the the pass is invalid', async () => {
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: false,
        isTransferred: false,
        reservedFor: new Date(),
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
      };

      const mockAggregateRes: PassInventoryAggregateView = {
        stage_id: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        date: new Date(),
        inventoryQuantity: 100,
        reservedQuantity: 0,
        cancelledQuantity: 0,
      };
      jest.spyOn(mockPrismaService.passes, 'update').mockResolvedValue(mockRes);
      jest.spyOn(mockPrismaService.passes, 'findUnique').mockResolvedValue(mockRes);
      const updateSpy = jest.spyOn(mockPrismaService.passInventoryAggregateView, 'findFirst');
      updateSpy.mockResolvedValue(mockAggregateRes);
      try {
        await service.amendPass(mockOrderId, mockAmendDate, mockStageId, mockUserId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw an error when no quota is available for amend', async () => {
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: false,
        isTransferred: false,
        reservedFor: new Date(),
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
      };

      const mockAggregateRes: PassInventoryAggregateView = {
        stage_id: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        date: new Date(),
        inventoryQuantity: 100,
        reservedQuantity: 100,
        cancelledQuantity: 0,
      };
      jest.spyOn(mockPrismaService.passes, 'update').mockResolvedValue(mockRes);
      jest.spyOn(mockPrismaService.passes, 'findUnique').mockResolvedValue(mockRes);
      const updateSpy = jest.spyOn(mockPrismaService.passInventoryAggregateView, 'findFirst');
      updateSpy.mockResolvedValue(mockAggregateRes);
      try {
        await service.amendPass(mockUserId, mockAmendDate, mockStageId, mockUserId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw an error when there is no pass inventory for the given stage or date', async () => {
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: false,
        isTransferred: false,
        reservedFor: new Date(),
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
      };

      jest.spyOn(mockPrismaService.passes, 'update').mockResolvedValue(mockRes);
      jest.spyOn(mockPrismaService.passes, 'findUnique').mockResolvedValue(mockRes);
      const updateSpy = jest.spyOn(mockPrismaService.passInventoryAggregateView, 'findFirst');
      updateSpy.mockResolvedValue(null);
      try {
        await service.amendPass(mockOrderId, mockAmendDate, mockStageId, mockUserId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw an error when user tries to reschdule a transferred pass', async () => {
      const mockRes = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: false,
          isTransferred: true,
          reservedFor: new Date(),
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
        },
      ];

      jest.spyOn(mockPrismaService.passes, 'findMany').mockResolvedValueOnce([]);
      try {
        await service.amendPass(mockRes[0].orderId, mockAmendDate, mockStageId, mockRes[0].userId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
