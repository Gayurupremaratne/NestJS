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
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { FAMILY_FRIENDLY_STATUS, NOTICE_STATUS, Notice, PEOPLE_INTERACTIONS } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StageDto } from '../stage/dto/stage.dto';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentService } from '../static-content/static-content.service';
import { GetNoticeDto } from './dto/get-notice.dto';
import { NoticeRepository } from './notice.repository';

describe('NoticeRepository', () => {
  let repository: NoticeRepository;
  let stageService: StageService;
  let createdStage: StageDto;
  let createdStage2: StageDto;
  let prisma: PrismaService;
  let userService: UserService;
  const randUUID = uuidv4();
  let createdUser: UserDto;
  let createdEmailNoticeForSpecificStage: Notice | Notice[];
  let createdNotificationNoticeForSpecificStage: Notice | Notice[];
  let createdNoticeForAllStages: Notice | Notice[];

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
    category: '',
    type: NOTICE_TYPE[0],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: startDate,
    endDate: new Date('2023-11-05T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const notificationNoticeForSpecificStage = {
    category: '',
    type: NOTICE_TYPE[1],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: new Date('2023-11-02T12:20:17.017Z'),
    endDate: new Date('2023-11-05T12:20:17.017Z'),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Title Here',
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
    number: 999,
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

  const stageRequestForEmptyNoticesArray = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: 998,
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
        NoticeRepository,
        UserService,
        PrismaService,
        StageService,
        StageRepository,
        UserRepository,
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
      ],
    }).compile();

    repository = module.get<NoticeRepository>(NoticeRepository);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
    stageService = module.get<StageService>(StageService);

    const responseCreateUser = await userService.createUser(userRequest);

    createdUser = Object.assign({}, responseCreateUser);

    const stageResponse = await stageService.createStage(stageRequest);
    createdStage = Object.assign({}, stageResponse);

    const stageResponse2 = await stageService.createStage(stageRequestForEmptyNoticesArray);
    createdStage2 = Object.assign({}, stageResponse2);

    emailNoticeForSpecificStage.category = createdStage.id;
    notificationNoticeForSpecificStage.category = createdStage.id;
    bothTypesNoticeForSpecificStage.category = createdStage.id;
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create notice', () => {
    it('should create a email notice for a specific stage', async () => {
      createdEmailNoticeForSpecificStage = await repository.createEmailNotice(
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
      createdNotificationNoticeForSpecificStage = await repository.createNotificationNotice(
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
    });

    it('should create a email notice for all stages', async () => {
      createdNoticeForAllStages = await repository.createEmailNotice(
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

    it('should throw an InternalServerErrorException when an unexpected Prisma error occurs during email notice creation', async () => {
      repository['prisma'].notice.create = jest.fn(() => {
        throw new Error('Some unexpected error');
      });

      try {
        await repository.createEmailNotice(createdUser.id, noticeRequestForAllStages);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('should throw an InternalServerErrorException when an unexpected Prisma error occurs during notification notice creation', async () => {
      repository['prisma'].notice.create = jest.fn(() => {
        throw new Error('Some unexpected error');
      });

      try {
        await repository.createNotificationNotice(createdUser.id, noticeRequestForAllStages);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  describe('Get latest 5 notices for a specific stage', () => {
    it('should get latest 5 notices for a specific stage', async () => {
      const stageId = notificationNoticeForSpecificStage.category;

      const responseGetNotices = await repository.getNoticesByStageId(stageId);

      expect(Array.isArray(responseGetNotices)).toBe(true);
      expect(responseGetNotices.length).toBeLessThanOrEqual(5);
    });

    it('should get return an empty object if there are no notices', async () => {
      const stageId = createdStage2.id;

      const responseGetNotices = await repository.getNoticesByStageId(stageId);

      expect(Array.isArray(responseGetNotices)).toBe(true);
      expect(responseGetNotices.length).toBeLessThanOrEqual(0);
    });

    it('should throw an error when trying get the stages by invalid stage id', async () => {
      const stageId = '5ef02c03';

      try {
        await repository.getNoticesByStageId(stageId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Invalid stage Id or failed to get notices.');
      }
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
      const responseDeletedNotice = await repository.deleteNotice(noticeId);
      const deletedNotice = Object.assign({}, responseDeletedNotice);

      expect(deletedNotice).toHaveProperty('id', noticeId);
    });

    it('should throw an error when trying to delete a notice with a wrong id', async () => {
      const invalidNoticeId = '1f9b6f32-d52b-4c42-afcc-b135222a0a92';
      try {
        await repository.deleteNotice(invalidNoticeId);
        fail('Expected deleteNotice to throw an error');
      } catch (error) {
        expect(error.message).toBe('Invalid notice Id or failed to delete notice.');
      }
    });
  });

  describe('Get all notice', () => {
    it('Should get all notices', async () => {
      let notificationNoticeId;
      let notificationCategory;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        notificationNoticeId = createdNotificationNoticeForSpecificStage[0].id;
        notificationCategory = createdNotificationNoticeForSpecificStage[0].category;
      } else {
        notificationNoticeId = createdNotificationNoticeForSpecificStage.id;
        notificationCategory = createdNotificationNoticeForSpecificStage.category;
      }

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
        },
        {
          id: notificationNoticeId,
          createdBy: expect.any(String),
          category: notificationCategory,
          type: 'NOTIFICATION',
          deliveryGroup: 'ALL',
          status: 'PENDING',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          title: 'Title Here',
          noticeTranslation: expect.any(Array),
          noticeStage: expect.any(Array),
        },
      ];

      const response = await repository.getAllNoticesEn({
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
      expect(data).toEqual(expected);
    });

    it('should throw error for invalid data when get all notices', async () => {
      try {
        await repository.getAllNoticesEn(null);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('Should get all notices with sorting by notice title', async () => {
      const response = await repository.getAllNoticesEn({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'title',
      });

      let notificationNoticeId;
      let notificationCategory;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        notificationNoticeId = createdNotificationNoticeForSpecificStage[0].id;
        notificationCategory = createdNotificationNoticeForSpecificStage[0].category;
      } else {
        notificationNoticeId = createdNotificationNoticeForSpecificStage.id;
        notificationCategory = createdNotificationNoticeForSpecificStage.category;
      }

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
          id: notificationNoticeId,
          createdBy: expect.any(String),
          category: notificationCategory,
          type: 'NOTIFICATION',
          deliveryGroup: 'ALL',
          status: 'PENDING',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          title: 'Title Here',
          noticeTranslation: expect.any(Array),
          noticeStage: expect.any(Array),
        },
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
        },
      ];
      const data = (response as PaginatedResult<GetNoticeDto>).data;
      expect(data).toEqual(expected);
    });

    it('should get pending notices', async () => {
      let notificationNoticeId;
      let notificationCategory;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        notificationNoticeId = createdNotificationNoticeForSpecificStage[0].id;
        notificationCategory = createdNotificationNoticeForSpecificStage[0].category;
      } else {
        notificationNoticeId = createdNotificationNoticeForSpecificStage.id;
        notificationCategory = createdNotificationNoticeForSpecificStage.category;
      }

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
          id: notificationNoticeId,
          category: notificationCategory,
          type: 'NOTIFICATION',
          noticeTranslation: expect.any(Array),
        },
        {
          id: allStageNoticeId,
          category: allStageCategory,
          type: 'EMAIL',
          noticeTranslation: expect.any(Array),
        },
      ];

      const result = await repository.getPendingNotices();
      expect(result).toStrictEqual(expected);
    });
  });

  describe('Update notice', () => {
    it('should update notice status', async () => {
      let notificationNoticeId;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        notificationNoticeId = createdNotificationNoticeForSpecificStage[0].id;
      } else {
        notificationNoticeId = createdNotificationNoticeForSpecificStage.id;
      }
      const result = await repository.updateNoticeStatus(NOTICE_STATUS.SENT, [
        notificationNoticeId,
      ]);
      expect(result).toStrictEqual({ count: 1 });
    });

    it('should throw error for invalid data when updating status', async () => {
      try {
        await repository.updateNoticeStatus(NOTICE_STATUS.SENT, null);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });

  afterAll(async () => {
    await prisma.notice.deleteMany({ where: { createdBy: createdUser.id } });
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.stage.delete({ where: { id: createdStage2.id } });

    await prisma.user.delete({ where: { email: createdUser.email } });
    await prisma.$disconnect();
  });
});
