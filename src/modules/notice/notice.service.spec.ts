import {
  DELIVERY_GROUP,
  NOTICE_TYPE,
  NOTICE_VALIDITY_PERIOD,
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATUS_CODE,
} from '@common/constants';
import { FAMILY_FRIENDLY_STATUS_CODE } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS_CODE } from '@common/constants/people_interaction.constant';
import { PaginatedResult } from '@common/helpers';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { $Enums, FAMILY_FRIENDLY_STATUS, Notice, PEOPLE_INTERACTIONS } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { CreateFcmTokenDto } from '../fcm-tokens/dto/create-fcm-token.dto';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { OrderRepository } from '../order/order.repository';
import { CreatePassInventoryDto } from '../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { StageDto } from '../stage/dto/stage.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentService } from '../static-content/static-content.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { GetNoticeDto } from './dto/get-notice.dto';
import { NoticeQueueDto } from './dto/notice-queue.dto';
import { PendingNoticeDto } from './dto/pending-notice.dto';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';
import { NoticeQueuePublisher } from './queue/notice.publisher';

describe('NoticeService', () => {
  let service: NoticeService;
  let fcmService: FcmTokensService;
  let prisma: PrismaService;
  let createdStage: StageDto;
  let stageService: StageService;
  let passInventoryService: PassInventoryService;
  let orderRepository: OrderRepository;
  let userService: UserService;
  const randUUID = uuidv4();
  let createdUser: UserDto;
  let createdEmailNoticeForSpecificStage: Notice | Notice[];
  let createdNotificationNoticeForSpecificStage: Notice | Notice[];
  let createdBothTypesNoticeForSpecificStage: Notice | Notice[];
  let createdNoticeForAllStages: Notice | Notice[];
  let specificStageNotice: Notice;

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const userRequest: CreateUserDto = {
    id: uuidv4(),
    firstName: 'test',
    lastName: 'test',
    email: `test${randUUID}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const startDate = moment().add(1, 'days').toDate();
  const emailNoticeForSpecificStage = {
    category: null,
    type: NOTICE_TYPE[0],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: startDate,
    endDate: new Date('2023-11-15T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const notificationNoticeForSpecificStage = {
    category: null,
    type: NOTICE_TYPE[1],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: new Date('2023-11-02T12:20:17.017Z'),
    endDate: new Date('2023-11-10T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const bothTypesNoticeForSpecificStage = {
    category: '',
    type: NOTICE_TYPE[2],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: new Date('2023-11-02T12:20:17.017Z'),
    endDate: new Date('2023-11-05T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const noticeRequestForAllStages = {
    category: null,
    type: NOTICE_TYPE[0],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: new Date('2023-11-02T12:20:17.017Z'),
    endDate: new Date('2023-11-05T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: 8,
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: null,
    startPoint: null,
    endPoint: null,
  };

  const fcmToken: CreateFcmTokenDto = {
    token: randUUID,
    deviceToken: randUUID,
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
    add: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const orderRequest: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 3,
      children: 1,
    },
    reservedFor: new Date('2023-09-10'),
  };

  const inventoryRequest: CreatePassInventoryDto = {
    date: new Date('2023-09-10'),
    quantity: 30,
    stageId: '',
  };

  const mockFcmService = {
    createFcmToken: jest.fn(),
    updateFcmToken: jest.fn(),
    getFcmTokensByUserId: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        NoticeService,
        NoticeRepository,
        UserService,
        PrismaService,
        StageService,
        StageRepository,
        UserRepository,
        OrderRepository,
        { provide: FcmTokensService, useValue: mockFcmService },
        PassesService,
        PassInventoryService,
        ConfigService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },

        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
      ],
    }).compile();

    service = module.get<NoticeService>(NoticeService);
    fcmService = module.get<FcmTokensService>(FcmTokensService);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
    stageService = module.get<StageService>(StageService);
    passInventoryService = module.get<PassInventoryService>(PassInventoryService);
    orderRepository = module.get<OrderRepository>(OrderRepository);

    const responseCreateUser = await userService.createUser(userRequest);

    createdUser = Object.assign({}, responseCreateUser);

    const stageResponse = await stageService.createStage(stageRequest);
    createdStage = Object.assign({}, stageResponse);

    emailNoticeForSpecificStage.category = createdStage.id;
    notificationNoticeForSpecificStage.category = createdStage.id;
    bothTypesNoticeForSpecificStage.category = createdStage.id;

    inventoryRequest.stageId = createdStage.id;
    orderRequest.stageId = createdStage.id;

    await fcmService.createFcmToken(createdUser.id, fcmToken);
    await passInventoryService.create(inventoryRequest);
    await orderRepository.createOrder(orderRequest, createdUser.id);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create notice', () => {
    it('should create a email notice for a specific stage', async () => {
      createdEmailNoticeForSpecificStage = await service.createNotice(
        createdUser.id,
        emailNoticeForSpecificStage,
      );
      expect(createdEmailNoticeForSpecificStage).toHaveProperty(
        'category',
        emailNoticeForSpecificStage.category,
      );
      expect(createdEmailNoticeForSpecificStage).toHaveProperty(
        'type',
        emailNoticeForSpecificStage.type,
      );
      expect(createdEmailNoticeForSpecificStage).toHaveProperty(
        'deliveryGroup',
        emailNoticeForSpecificStage.deliveryGroup,
      );
      expect(createdEmailNoticeForSpecificStage).toHaveProperty(
        'startDate',
        moment(emailNoticeForSpecificStage.startDate).startOf('day').toDate(),
      );
      expect(createdEmailNoticeForSpecificStage).toHaveProperty(
        'endDate',
        moment(emailNoticeForSpecificStage.endDate).startOf('day').toDate(),
      );
    });

    it('should create a notification notice for a specific stage', async () => {
      createdNotificationNoticeForSpecificStage = await service.createNotice(
        createdUser.id,
        notificationNoticeForSpecificStage,
      );
      expect(createdNotificationNoticeForSpecificStage).toHaveProperty(
        'category',
        notificationNoticeForSpecificStage.category,
      );
      expect(createdNotificationNoticeForSpecificStage).toHaveProperty(
        'type',
        notificationNoticeForSpecificStage.type,
      );
      expect(createdNotificationNoticeForSpecificStage).toHaveProperty(
        'deliveryGroup',
        notificationNoticeForSpecificStage.deliveryGroup,
      );
      expect(createdNotificationNoticeForSpecificStage).toHaveProperty(
        'startDate',
        moment(notificationNoticeForSpecificStage.startDate).startOf('day').toDate(),
      );
      expect(createdNotificationNoticeForSpecificStage).toHaveProperty(
        'endDate',
        moment(notificationNoticeForSpecificStage.endDate).startOf('day').toDate(),
      );

      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        specificStageNotice = createdNotificationNoticeForSpecificStage[0];
      } else {
        specificStageNotice = createdNotificationNoticeForSpecificStage;
      }
    });

    it('should create both email and notification notices for a specific stage', async () => {
      createdBothTypesNoticeForSpecificStage = await service.createNotice(
        createdUser.id,
        bothTypesNoticeForSpecificStage,
      );
      // Results for email notice
      expect(createdBothTypesNoticeForSpecificStage[0]).toHaveProperty(
        'category',
        bothTypesNoticeForSpecificStage.category,
      );
      expect(createdBothTypesNoticeForSpecificStage[0]).toHaveProperty('type', NOTICE_TYPE[0]);
      expect(createdBothTypesNoticeForSpecificStage[0]).toHaveProperty(
        'deliveryGroup',
        bothTypesNoticeForSpecificStage.deliveryGroup,
      );
      expect(createdBothTypesNoticeForSpecificStage[0]).toHaveProperty(
        'startDate',
        moment(bothTypesNoticeForSpecificStage.startDate).startOf('day').toDate(),
      );
      expect(createdBothTypesNoticeForSpecificStage[0]).toHaveProperty(
        'endDate',
        moment(bothTypesNoticeForSpecificStage.endDate).startOf('day').toDate(),
      );

      // Results for notification notice
      expect(createdBothTypesNoticeForSpecificStage[1]).toHaveProperty(
        'category',
        bothTypesNoticeForSpecificStage.category,
      );
      expect(createdBothTypesNoticeForSpecificStage[1]).toHaveProperty('type', NOTICE_TYPE[1]);
      expect(createdBothTypesNoticeForSpecificStage[1]).toHaveProperty(
        'deliveryGroup',
        bothTypesNoticeForSpecificStage.deliveryGroup,
      );
      expect(createdBothTypesNoticeForSpecificStage[1]).toHaveProperty(
        'startDate',
        moment(bothTypesNoticeForSpecificStage.startDate).startOf('day').toDate(),
      );
      expect(createdBothTypesNoticeForSpecificStage[1]).toHaveProperty(
        'endDate',
        moment(bothTypesNoticeForSpecificStage.endDate).startOf('day').toDate(),
      );
    });

    it('should create a email notice for all stages', async () => {
      createdNoticeForAllStages = await service.createNotice(
        createdUser.id,
        noticeRequestForAllStages,
      );
      expect(createdNoticeForAllStages).toHaveProperty('type', noticeRequestForAllStages.type);
      expect(createdNoticeForAllStages).toHaveProperty(
        'deliveryGroup',
        noticeRequestForAllStages.deliveryGroup,
      );
      expect(createdNoticeForAllStages).toHaveProperty(
        'startDate',
        moment(noticeRequestForAllStages.startDate).startOf('day').toDate(),
      );
      expect(createdNoticeForAllStages).toHaveProperty(
        'endDate',
        moment(noticeRequestForAllStages.endDate).startOf('day').toDate(),
      );
    });

    it('should throw an error for missing English translation fields', async () => {
      const noticeWithPartialTranslation = {
        category: createdStage.id,
        type: NOTICE_TYPE[1],
        deliveryGroup: DELIVERY_GROUP[0],
        isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
        startDate: new Date('2023-11-02T12:20:17.017Z'),
        endDate: new Date('2023-11-10T12:20:17.017Z'),
        noticeTranslation: [
          {
            localeId: 'en',
            title: 'test',
            description: null,
          },
        ],
      };

      await expect(
        service.createNotice('userId', noticeWithPartialTranslation),
      ).rejects.toThrowError('English translation must have both title and description');
    });
  });

  describe('Get latest 5 notices for a specific stage', () => {
    it('should get latest 5 notices for a specific stage', async () => {
      const stageId = notificationNoticeForSpecificStage.category;

      const responseGetNotices = await service.getNoticesByStageId(stageId);

      expect(Array.isArray(responseGetNotices)).toBe(true);
      expect(responseGetNotices.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Get a notice', () => {
    it('should get a notice', async () => {
      let noticeId: string;
      if (Array.isArray(createdEmailNoticeForSpecificStage)) {
        noticeId = createdEmailNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdEmailNoticeForSpecificStage.id;
      }
      const responseGetNotice = await service.getNoticeById(noticeId);
      const getNotice = Object.assign({}, responseGetNotice);

      expect(getNotice).toHaveProperty('id', noticeId);
    });
  });

  describe('Delete a notice', () => {
    it('should delete a notice', async () => {
      let noticeId: string;
      if (Array.isArray(createdEmailNoticeForSpecificStage)) {
        noticeId = createdEmailNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdEmailNoticeForSpecificStage.id;
      }
      const responseDeletedNotice = await service.deleteNotice(noticeId);
      const deletedNotice = Object.assign({}, responseDeletedNotice);

      expect(deletedNotice).toHaveProperty('id', noticeId);
    });

    it('should throw an error when trying to delete a notice with a wrong id', async () => {
      const invalidNoticeId = '1f9b6f32-d52b-4c42-afcc-b135222a0a92';
      try {
        await service.deleteNotice(invalidNoticeId);
        fail('Expected deleteNotice to throw an error');
      } catch (error) {
        expect(error.message).toBe('Notice not found');
      }
    });

    it('should throw an error when trying to delete a notice with the status pending but the start date is equals or passed current date', async () => {
      let noticeId: string;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        noticeId = createdNotificationNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdNotificationNoticeForSpecificStage.id;
      }
      try {
        await service.deleteNotice(noticeId);
        fail('Expected deleteNotice to throw an error');
      } catch (error) {
        expect(error.message).toBe('Cannot delete the notice');
      }
    });
  });

  describe('Get all notice', () => {
    it('Should get all notices', async () => {
      let allStageNoticeId;
      let allStageCategory;
      if (Array.isArray(createdNoticeForAllStages)) {
        allStageNoticeId = createdNoticeForAllStages[0].id;
        allStageCategory = createdNoticeForAllStages[0].category;
      } else {
        allStageNoticeId = createdNoticeForAllStages.id;
        allStageCategory = createdNoticeForAllStages.category;
      }

      const expected = [
        {
          id: allStageNoticeId,
          createdBy: expect.any(String),
          category: allStageCategory,
          type: 'EMAIL',
          deliveryGroup: 'ALL',
          status: 'PENDING',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          title: 'Your Title Here',
          noticeTranslation: expect.any(Array),
          noticeStage: expect.any(Array),
          isEligibleForModifyOrDelete: false,
        },
      ];

      const response = await service.getAll({
        pageNumber: 1,
        perPage: 10,
        orderBy: [
          {
            field: 'title',
            sortBy: 'desc',
          },
        ],
      });

      const data = (response as PaginatedResult<GetNoticeDto>).data;
      expect(expected[0]).toStrictEqual(data[0]);
      expect(data).toHaveLength(4);
    });

    it('Should get all notices with sorting by notice title', async () => {
      const response = await service.getAll({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'title',
      });

      expect((response as PaginatedResult<GetNoticeDto>).data).toBeDefined();
    });

    it('Should get all general email notices with user data', async () => {
      let allStageNotice: Notice;
      if (Array.isArray(createdNoticeForAllStages)) {
        allStageNotice = createdNoticeForAllStages[0];
      } else {
        allStageNotice = createdNoticeForAllStages;
      }

      const pendingNotice: PendingNoticeDto = {
        id: allStageNotice.id,
        type: 'EMAIL',
        category: null,
        noticeTranslation: [
          {
            noticeId: allStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const response = await service.sendGeneralNoticeToQueue(pendingNotice);
      expect(response).toStrictEqual(pendingNotice);
    });

    it('Should get all stage wise email notices with user data', async () => {
      const pendingNotice: PendingNoticeDto = {
        id: specificStageNotice.id,
        type: 'EMAIL',
        category: specificStageNotice.category,
        noticeTranslation: [
          {
            noticeId: specificStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const response = await service.sendStageWiseNoticeToQueue(pendingNotice);
      expect(response).toStrictEqual(pendingNotice);
    });

    it('should send stage wise notices to queue', async () => {
      const pendingNotice: PendingNoticeDto = {
        id: specificStageNotice.id,
        type: 'EMAIL',
        category: specificStageNotice.category,
        noticeTranslation: [
          {
            noticeId: specificStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const response = await service.sendNoticesToQueue([pendingNotice]);
      expect(response).toStrictEqual([pendingNotice]);
    });

    it('should send general notices to queue', async () => {
      const pendingNotice: PendingNoticeDto = {
        id: specificStageNotice.id,
        type: 'EMAIL',
        category: null,
        noticeTranslation: [
          {
            noticeId: specificStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const response = await service.sendNoticesToQueue([pendingNotice]);
      expect(response).toStrictEqual([pendingNotice]);
    });

    it('should throw error for invalid data when send notices to queue', async () => {
      const pendingNotice: PendingNoticeDto = {
        id: 'invalid-id',
        type: specificStageNotice.type,
        category: 'invalid-category',
        noticeTranslation: [
          {
            noticeId: specificStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      try {
        await service.sendNoticesToQueue([pendingNotice]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should get notice with validity period', () => {
      const noticeWithoutValidityPeriod: CreateNoticeDto = {
        category: '',
        type: NOTICE_TYPE[0],
        deliveryGroup: DELIVERY_GROUP[0],
        isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[1],
        startDate: null,
        endDate: null,
        noticeTranslation: [
          {
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
          },
        ],
      };
      const updatedNotice = service.getNoticeWithValidityPeriod(noticeWithoutValidityPeriod);
      expect(updatedNotice.startDate).toBeInstanceOf(Date);
      expect(updatedNotice.endDate).toBeInstanceOf(Date);
    });
  });

  describe('send notices to queue', () => {
    it('send notices to mail queue', async () => {
      const mailQueueData: NoticeQueueDto = {
        id: specificStageNotice.id,
        noticeTranslation: [
          {
            title: 'test',
            description: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
            localeId: 'en',
            noticeId: specificStageNotice.id,
          },
        ],
        type: $Enums.NOTICE_TYPE.EMAIL,
        userId: createdUser.id,
      };

      const noticeMail = await service.sendNoticeToMailQueue(mailQueueData);
      expect(noticeMail).toStrictEqual(mailQueueData);
    });

    it('throw error for invalid data', async () => {
      jest.spyOn(mockQueue, 'add').mockImplementation(async () => {
        throw new Error();
      });

      const mailQueueData: NoticeQueueDto = {
        id: specificStageNotice.id,
        noticeTranslation: [
          {
            title: 'test',
            description: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
            localeId: 'en',
            noticeId: specificStageNotice.id,
          },
        ],
        type: $Enums.NOTICE_TYPE.EMAIL,
        userId: createdUser.id,
      };

      const noticeMail = service.sendNoticeToMailQueue(mailQueueData);
      expect(noticeMail).rejects.toBeInstanceOf(Error);
    });

    it('send notices to notification queue', async () => {
      const notificationQueueData: NoticeQueueDto = {
        id: specificStageNotice.id,
        noticeTranslation: [
          {
            title: 'test',
            description: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
            localeId: 'en',
            noticeId: specificStageNotice.id,
          },
        ],
        type: $Enums.NOTICE_TYPE.EMAIL,
        userId: createdUser.id,
      };

      jest.spyOn(mockFcmService, 'getFcmTokensByUserId').mockImplementation(async () => {
        return [{ userId: createdUser.id, token: '1234' }];
      });

      const notification = await service.sendNoticeToNotificationQueue(notificationQueueData);
      expect(notification).toStrictEqual(notificationQueueData);
    });

    it('should return null when fcm tokens not available for user', async () => {
      const notificationQueueData: NoticeQueueDto = {
        id: specificStageNotice.id,
        noticeTranslation: [
          {
            title: 'test',
            description: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
            localeId: 'en',
            noticeId: specificStageNotice.id,
          },
        ],
        type: $Enums.NOTICE_TYPE.EMAIL,
        userId: createdUser.id,
      };

      jest.spyOn(mockFcmService, 'getFcmTokensByUserId').mockImplementation(async () => {
        return null;
      });

      const notification = await service.sendNoticeToNotificationQueue(notificationQueueData);
      expect(notification).toBe(null);
    });

    it('should return english translation as default for notice', async () => {
      const pendingNotice: PendingNoticeDto = {
        id: specificStageNotice.id,
        type: 'EMAIL',
        category: specificStageNotice.category,
        noticeTranslation: [
          {
            noticeId: specificStageNotice.id,
            localeId: 'en',
            title: 'Your Title Here',
            description: 'Your Description Here',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const notification = await service.filterTranslationByLocale(pendingNotice, 'fr');
      expect(notification).toBe(pendingNotice.noticeTranslation[0]);
    });
  });

  afterAll(async () => {
    await prisma.notice.deleteMany({ where: { createdBy: createdUser.id } });
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { email: createdUser.email } });
    await prisma.$disconnect();
  });
});
