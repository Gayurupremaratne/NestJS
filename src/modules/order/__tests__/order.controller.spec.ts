import { StageDto } from '@app/modules/stage/dto/stage.dto';
import {
  PLATFORM,
  QUEUES,
  REGISTRATION_STATUS,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATUS_CODE,
} from '@common/constants';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import { RoleType } from '@common/constants/role_type.constants';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, ForbiddenException, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserController } from '@user/user.controller';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { MailService } from '../../../modules/mail/mail.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { CreatePassInventoryDto } from '../../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryController } from '../../pass-inventory/pass-inventory.controller';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { PushNotificationService } from '../../push-notification/push-notification.service';
import { StageController } from '../../stage/stage.controller';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderDto } from '../dto/order.dto';
import { OrderController } from '../order.controller';
import { OrderRepository } from '../order.repository';
import { OrderService } from '../order.service';
import { OrderEligibilityQuery } from '../dto/order-eligibility-dto';

describe('OrderController', () => {
  let app: INestApplication;
  let stageController: StageController;
  let orderController: OrderController;
  let passInventoryController: PassInventoryController;
  let userService: UserService;
  let orderDto: OrderDto;
  let stageDto: StageDto;
  let userDto: UserDto;
  let prisma: PrismaService;
  const reqUser = {
    sub: '',
  };
  const userId = uuidv4();

  const futureDateForOrderEligibility = new Date();
  futureDateForOrderEligibility.setDate(new Date().getDate() + 3);
  const orderRequest: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 1,
      children: 1,
    },
    reservedFor: new Date(),
  };

  const checkOrderEligibilityRequest: OrderEligibilityQuery = {
    stageId: '',
    reservedDate: futureDateForOrderEligibility,
  };
  const checkOrderEligibilityErrorRequest: OrderEligibilityQuery = {
    stageId: '',
    reservedDate: new Date(),
  };

  const inventoryRequest: CreatePassInventoryDto = {
    date: new Date(),
    quantity: 10,
    stageId: '',
  };

  const stageRequest = {
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
  };

  const userRequest = {
    id: userId,
    firstName: 'test',
    lastName: 'test',
    email: `test${userId}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
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
      controllers: [OrderController, UserController, StageController, PassInventoryController],
      providers: [
        PrismaService,
        OrderService,
        PassesService,
        StaticContentService,
        ConfigService,
        OrderRepository,
        UserService,
        StageService,
        UserRepository,
        StaticContentRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        StageRepository,
        PassInventoryService,
        FcmTokensService,
        NoticeService,
        NoticeRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    stageController = module.get<StageController>(StageController);
    orderController = module.get<OrderController>(OrderController);
    userService = module.get<UserService>(UserService);
    passInventoryController = module.get<PassInventoryController>(PassInventoryController);
    prisma = module.get(PrismaService);

    const stageResponseOne = await stageController.createStage(stageRequest);
    stageDto = stageResponseOne.data;
    checkOrderEligibilityRequest.stageId = stageResponseOne.data.id;
    checkOrderEligibilityErrorRequest.stageId = stageResponseOne.data.id;

    const userResponse = await userService.createUser(userRequest);
    userDto = userResponse;
    reqUser.sub = userDto.id;

    orderRequest.stageId = stageDto.id;
    inventoryRequest.stageId = stageDto.id;

    await passInventoryController.create(inventoryRequest);
  });

  describe('Create an order', () => {
    it('should create an order with passes for mobile', async () => {
      const orderResponse = await orderController.createOrder(orderRequest, reqUser, {
        headers: {
          platform: PLATFORM.mobile,
        },
      });
      orderDto = orderResponse.data;

      expect(orderDto).toBeDefined();
      await orderController.deleteOrder(orderResponse.data.id);
    });
    it('should throw forbidden error', async () => {
      await expect(
        orderController.createOrder({ ...orderRequest, userId: userDto.id }, reqUser, {
          headers: {
            platform: PLATFORM.web,
          },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
    it('should create an order with passes for web', async () => {
      await prisma.user.update({
        where: { id: userDto.id },
        data: {
          role_id: RoleType.SuperAdmin,
        },
      });
      const orderResponse = await orderController.createOrder(
        { ...orderRequest, userId: userDto.id },
        reqUser,
        {
          headers: {
            platform: PLATFORM.web,
          },
        },
      );
      orderDto = orderResponse.data;

      expect(orderDto).toBeDefined();
    });
  });

  describe('Get orders by stage id', () => {
    it('should get orders by stage id', async () => {
      const orderResponse = await orderController.getPassOrdersByStage(
        {
          stageId: stageDto.id,
        },
        {
          perPage: 1,
          pageNumber: 10,
          date: new Date('2023-09-02T12:20:17.017Z'),
          sortBy: 'user',
        },
      );
      const orders = orderResponse.data;

      expect(orders).toBeDefined();
    });
  });

  describe('Get order eligibility', () => {
    it('should get order eligibility', async () => {
      const response = await orderController.checkMobileOrderEligibility(
        reqUser,
        checkOrderEligibilityRequest,
      );

      expect(response).toBeDefined();
    });
    it('should throw BadRequestException error', async () => {
      await expect(
        orderController.checkMobileOrderEligibility(reqUser, checkOrderEligibilityErrorRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Delete an order', () => {
    it('should delete an order', async () => {
      const orderResponse = await orderController.deleteOrder(orderDto.id);
      const order = orderResponse.data;

      expect(order).toStrictEqual(orderDto.id);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });
});
