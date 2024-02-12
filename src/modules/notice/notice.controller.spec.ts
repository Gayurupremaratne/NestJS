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
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { FAMILY_FRIENDLY_STATUS, Notice, PEOPLE_INTERACTIONS } from '@prisma/client';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { FcmTokensService } from '../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { OrderRepository } from '../order/order.repository';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassesService } from '../passes/passes.service';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { StageDto } from '../stage/dto/stage.dto';
import { StageController } from '../stage/stage.controller';
import { StageRepository } from '../stage/stage.repository';
import { StageService } from '../stage/stage.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { NoticeController } from './notice.controller';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';
import { NoticeQueuePublisher } from './queue/notice.publisher';

describe('NoticeController', () => {
  let controller: NoticeController;
  let stageController: StageController;
  let createdStage: StageDto;
  let prisma: PrismaService;
  let app: INestApplication;
  let mockAbilitiesGuard: AbilitiesGuard;
  let userRepository: UserRepository;
  let createdEmailNoticeForSpecificStage: Notice | Notice[];
  let createdNotificationNoticeForSpecificStage: Notice | Notice[];
  let createdBothTypesNoticeForSpecificStage: Notice | Notice[];
  let createdOldStartDateNoticeForSpecificStage: Notice | Notice[];
  let createdNoticeForAllStages: Notice | Notice[];
  const randUUID = uuidv4();
  let createdUser: UserDto;

  const userRequest = {
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

  const emailNoticeForSpecificStage = {
    category: '',
    type: NOTICE_TYPE[0],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: moment().add(1, 'days').toDate(),
    endDate: moment().add(2, 'days').toDate(),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
    createdBy: userRequest.id,
  };

  const notificationNoticeForSpecificStage = {
    category: '',
    type: NOTICE_TYPE[1],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: moment().add(1, 'days').toDate(),
    endDate: moment().add(2, 'days').toDate(),
    noticeTranslation: [
      {
        localeId: 'en',
        title: 'Your Title Here',
        description: 'Your Description Here',
      },
    ],
  };

  const oldStartDateNoticeForSpecificStage = {
    category: '',
    type: NOTICE_TYPE[1],
    deliveryGroup: DELIVERY_GROUP[0],
    isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
    startDate: moment().subtract(1, 'days').toDate(),
    endDate: moment().add(2, 'days').toDate(),
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
        title: 'Title Here',
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
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

  const mockedUser = {
    sub: userRequest.id,
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
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

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [NoticeController, UserController, StageController],
      providers: [
        NoticeService,
        UserService,
        UserRepository,
        NoticeRepository,
        StaticContentService,
        StaticContentRepository,
        PrismaService,
        StageService,
        StageRepository,
        OrderRepository,
        PassesService,
        PassInventoryService,
        FcmTokensService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<NoticeController>(NoticeController);
    stageController = module.get<StageController>(StageController);
    prisma = module.get(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    userRepository = module.get<UserRepository>(UserRepository);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    const responseCreateUser = await userRepository.createUser(userRequest);

    createdUser = Object.assign({}, responseCreateUser);

    const responseCreateStage = await stageController.createStage(stageRequest);

    createdStage = Object.assign({}, responseCreateStage.data);

    emailNoticeForSpecificStage.category = createdStage.id;
    notificationNoticeForSpecificStage.category = createdStage.id;
    bothTypesNoticeForSpecificStage.category = createdStage.id;
    oldStartDateNoticeForSpecificStage.category = createdStage.id;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Create a notice', () => {
    it('should create a email notice for a specific stage', async () => {
      const responseCreateNotice = await controller.createNotice(
        mockedUser,
        emailNoticeForSpecificStage,
      );
      createdEmailNoticeForSpecificStage = Object.assign({}, responseCreateNotice.data);
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
      const responseCreateNotice = await controller.createNotice(
        mockedUser,
        notificationNoticeForSpecificStage,
      );
      createdNotificationNoticeForSpecificStage = Object.assign({}, responseCreateNotice.data);
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

    it('should create both email and notification notices for a specific stage', async () => {
      const responseCreateNotice = await controller.createNotice(
        mockedUser,
        bothTypesNoticeForSpecificStage,
      );
      createdBothTypesNoticeForSpecificStage = Object.assign({}, responseCreateNotice.data);
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
      const responseCreateNotice = await controller.createNotice(
        mockedUser,
        noticeRequestForAllStages,
      );
      createdNoticeForAllStages = Object.assign({}, responseCreateNotice.data);
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

    it('should create a old start date notice for a specific stage', async () => {
      const responseCreateNotice = await controller.createNotice(
        mockedUser,
        oldStartDateNoticeForSpecificStage,
      );
      createdOldStartDateNoticeForSpecificStage = Object.assign({}, responseCreateNotice.data);
      expect(createdOldStartDateNoticeForSpecificStage).toBeDefined();
    });
  });

  describe('Update a notice', () => {
    it('should update a email notice', async () => {
      let noticeId: string;
      if (Array.isArray(createdEmailNoticeForSpecificStage)) {
        noticeId = createdEmailNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdEmailNoticeForSpecificStage.id;
      }

      delete emailNoticeForSpecificStage.type;

      const responseUpdateNotice = await controller.updateNotice(
        mockedUser,
        { id: noticeId },
        emailNoticeForSpecificStage,
      );

      const updatedNotice = Object.assign({}, responseUpdateNotice.data);
      expect(updatedNotice).toHaveProperty('id', noticeId);
      expect(updatedNotice).toHaveProperty('category', emailNoticeForSpecificStage.category);
      expect(updatedNotice).toHaveProperty(
        'deliveryGroup',
        emailNoticeForSpecificStage.deliveryGroup,
      );
      expect(updatedNotice).toHaveProperty('startDate', emailNoticeForSpecificStage.startDate);
      expect(updatedNotice).toHaveProperty('endDate', emailNoticeForSpecificStage.endDate);
    });

    it('should update a notification notice', async () => {
      let noticeId: string;
      if (Array.isArray(createdNotificationNoticeForSpecificStage)) {
        noticeId = createdNotificationNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdNotificationNoticeForSpecificStage.id;
      }

      delete notificationNoticeForSpecificStage.type;

      const responseUpdateNotice = await controller.updateNotice(
        mockedUser,
        { id: noticeId },
        notificationNoticeForSpecificStage,
      );

      const updatedNotice = Object.assign({}, responseUpdateNotice.data);
      expect(updatedNotice).toHaveProperty('id', noticeId);
      expect(updatedNotice).toHaveProperty('category', notificationNoticeForSpecificStage.category);
      expect(updatedNotice).toHaveProperty(
        'deliveryGroup',
        notificationNoticeForSpecificStage.deliveryGroup,
      );
      expect(updatedNotice).toHaveProperty(
        'startDate',
        notificationNoticeForSpecificStage.startDate,
      );
      expect(updatedNotice).toHaveProperty('endDate', notificationNoticeForSpecificStage.endDate);
    });

    it('should throw an error when trying to update a notice with the status pending but the start date is equals or passed current date', async () => {
      let noticeId: string;
      if (Array.isArray(createdOldStartDateNoticeForSpecificStage)) {
        noticeId = createdOldStartDateNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdOldStartDateNoticeForSpecificStage.id;
      }

      delete oldStartDateNoticeForSpecificStage.type;

      async function asyncFunctionThatThrowsError() {
        await controller.updateNotice(
          mockedUser,
          { id: noticeId },
          oldStartDateNoticeForSpecificStage,
        );
      }
      expect(asyncFunctionThatThrowsError).rejects.toThrowError();
    });

    it('should throw an error when trying to update the notice type', async () => {
      let noticeId: string;
      if (Array.isArray(createdBothTypesNoticeForSpecificStage)) {
        noticeId = createdBothTypesNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdBothTypesNoticeForSpecificStage.id;
      }

      delete bothTypesNoticeForSpecificStage.type;

      async function asyncFunctionThatThrowsError() {
        await controller.updateNotice(
          mockedUser,
          { id: noticeId },
          bothTypesNoticeForSpecificStage,
        );
      }
      expect(asyncFunctionThatThrowsError).rejects.toThrowError();
    });

    it('should throw an error when trying to create a notice with wrong stage Id', async () => {
      const noticeWithInvalidStage = {
        category: '1f9b6f32-d52b-4c42-afcc-b135222a0a92',
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

      try {
        await controller.createNotice(createdUser.id, noticeWithInvalidStage);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should throw an error when trying to create a notice with partial translation data', async () => {
      const noticeWithPartialTranslation = {
        category: '1f9b6f32-d52b-4c42-afcc-b135222a0a92',
        type: NOTICE_TYPE[1],
        deliveryGroup: DELIVERY_GROUP[0],
        isValidityPeriodDefined: NOTICE_VALIDITY_PERIOD[0],
        startDate: new Date('2023-11-02T12:20:17.017Z'),
        endDate: new Date('2023-11-10T12:20:17.017Z'),
        noticeTranslation: [
          {
            localeId: 'en',
            title: 'Your Title Here',
            description: '',
          },
        ],
      };

      try {
        await controller.createNotice(createdUser.id, noticeWithPartialTranslation);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('Get latest 5 notices for a specific stage', () => {
    it('should get latest 5 notices for a specific stage', async () => {
      const stageId = notificationNoticeForSpecificStage.category;
      const responseGetNotices = await controller.getNoticesByStageId({ stageId: stageId });

      const allNotices = Object.assign({}, responseGetNotices);
      expect(Array.isArray(allNotices.data)).toBe(true);
      expect(allNotices.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Should get notices', () => {
    it('Should get all notices', async () => {
      const response = await controller.getAllNoticeEn({
        pageNumber: 1,
        perPage: 10,
      });
      expect(Object.assign({}, response.data)).toHaveProperty('data');
    });

    it('Should get all notices with sorting', async () => {
      const response = await controller.getAllNoticeEn({
        pageNumber: 1,
        perPage: 10,
        sortBy: 'title',
      });

      expect(Object.assign({}, response.data)).toHaveProperty('data');
    });
  });

  describe('Should get notice by notice id', () => {
    it('Should get notice by id', async () => {
      let noticeId: string;
      if (Array.isArray(createdEmailNoticeForSpecificStage)) {
        noticeId = createdEmailNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdEmailNoticeForSpecificStage.id;
      }

      const responseGetNotice = await controller.getNoticeById({ id: noticeId });

      const getNotice = Object.assign({}, responseGetNotice);

      expect(getNotice.data).toHaveProperty('id', noticeId);
    });

    it('should throw an error when trying to get a notice with a wrong id', async () => {
      const invalidNoticeId = { id: uuidv4() };
      try {
        await controller.getNoticeById(invalidNoticeId);
      } catch (error) {
        // Ensure the error is an InternalServerErrorException
        expect(error).toBeInstanceOf(NotFoundException);
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
      const responseDeletedNotice = controller.deleteNotice({ id: noticeId });

      const deletedNotice = Object.assign({}, responseDeletedNotice);

      expect(deletedNotice).toStrictEqual({});
    });

    it('should throw an error when trying to delete a notice with a wrong id', async () => {
      const invalidNoticeId = '1f9b6f32-d52b-4c42-afcc-b135222a0a92';
      try {
        await controller.deleteNotice({ id: invalidNoticeId });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should throw an error when trying to delete a notice with the status pending but the start date is equals or passed current date', async () => {
      let noticeId: string;
      if (Array.isArray(createdOldStartDateNoticeForSpecificStage)) {
        noticeId = createdOldStartDateNoticeForSpecificStage[0].id;
      } else {
        noticeId = createdOldStartDateNoticeForSpecificStage.id;
      }

      try {
        await controller.deleteNotice({ id: noticeId });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  afterAll(async () => {
    await prisma.notice.deleteMany({ where: { createdBy: createdUser.id } });
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.user.delete({ where: { id: createdUser.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
