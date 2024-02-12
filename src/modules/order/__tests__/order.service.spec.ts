import { StageDto } from '@app/modules/stage/dto/stage.dto';
import {
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
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../../../modules/mail/mail.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { CreatePassInventoryDto } from '../../pass-inventory/dto/create-pass-inventory.dto';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserDto } from '../../user/dto/user.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderDto } from '../dto/order.dto';
import { OrderRepository } from '../order.repository';
import { OrderService } from '../order.service';
import { OrderEligibilityQuery } from '../dto/order-eligibility-dto';

describe('OrderService', () => {
  let stageService: StageService;
  let orderService: OrderService;
  let userService: UserService;
  let passInventoryService: PassInventoryService;
  let orderDto: OrderDto;
  let stageDto: StageDto;
  let userDto: UserDto;
  let prisma: PrismaService;

  const orderRequest: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 4,
      children: 1,
    },
    reservedFor: new Date(),
  };

  const checkOrderEligibilityRequest: OrderEligibilityQuery = {
    stageId: '',
    reservedDate: new Date(),
  };

  const orderRequestTwo: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 3,
      children: 1,
    },
    reservedFor: new Date('2023-09-10'),
  };

  const invalidOrderRequestWithNoPassCount: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 0,
      children: 0,
    },
    reservedFor: new Date('2023-09-02'),
  };

  const orderRequestToFail: CreateOrderDto = {
    stageId: '',
    passCount: {
      adults: 4,
      children: 4,
    },
    reservedFor: new Date('2023-09-03'),
  };

  const inventoryRequestOne: CreatePassInventoryDto = {
    date: new Date(),
    quantity: 30,
    stageId: '',
  };

  const inventoryRequestTwo: CreatePassInventoryDto = {
    date: new Date('2023-09-03'),
    quantity: 30,
    stageId: '',
  };

  const inventoryRequestThree: CreatePassInventoryDto = {
    date: new Date('2023-09-10'),
    quantity: 30,
    stageId: '',
  };

  const userId = uuidv4();

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
  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        PrismaService,
        OrderService,
        PassesService,
        StaticContentService,
        OrderRepository,
        UserService,
        StageService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        UserRepository,
        StaticContentRepository,
        StageRepository,
        PassInventoryService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
      ],
    }).compile();

    stageService = module.get<StageService>(StageService);
    orderService = module.get<OrderService>(OrderService);
    userService = module.get<UserService>(UserService);
    passInventoryService = module.get<PassInventoryService>(PassInventoryService);
    prisma = module.get(PrismaService);

    const stageResponseOne = await stageService.createStage(stageRequest);
    stageDto = stageResponseOne;
    checkOrderEligibilityRequest.stageId = stageResponseOne.id;

    const userResponse = await userService.createUser(userRequest);
    userDto = userResponse;

    orderRequest.stageId = stageDto.id;
    orderRequestTwo.stageId = stageDto.id;
    invalidOrderRequestWithNoPassCount.stageId = stageDto.id;
    orderRequestToFail.stageId = stageDto.id;
    inventoryRequestOne.stageId = stageDto.id;
    inventoryRequestTwo.stageId = stageDto.id;
    inventoryRequestThree.stageId = stageDto.id;
    await passInventoryService.create(inventoryRequestOne);
    await passInventoryService.create(inventoryRequestTwo);
    await passInventoryService.create(inventoryRequestThree);
    await orderService.createOrder(orderRequestTwo, userDto.id);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Get order eligibility', () => {
    it('should get order eligibility', async () => {
      const response = await orderService.checkOrderEligibility(
        checkOrderEligibilityRequest,
        userDto.id,
      );

      expect(response).toBeDefined();
    });
  });

  describe('Create an order', () => {
    it('should create an order with passes', async () => {
      const orderResponse = await orderService.createOrder(orderRequest, userDto.id);
      orderDto = orderResponse;

      expect(orderDto).toBeDefined();
    });

    it('should throw an error for not having any pass count', async () => {
      const errorFunction = async () => {
        await orderService.createOrder(invalidOrderRequestWithNoPassCount, userDto.id);
      };

      expect(errorFunction()).rejects.toThrow(BadRequestException);
    });

    it('should throw an error for requesting more than allowed per time', async () => {
      const errorFunction = async () => {
        await orderService.createOrder(orderRequestToFail, userDto.id);
      };

      expect(errorFunction()).rejects.toThrow(BadRequestException);
    });
  });

  describe('Get orders by stage', () => {
    const sortBy = 'user';
    it('should get orders by stage', async () => {
      const orderResponse = await orderService.getOrdersByStage(stageDto.id, {
        pageNumber: 1,
        perPage: 1,
        date: new Date('2023-09-01'),
        sortBy,
      });

      expect(orderResponse).toBeDefined();
    });

    it('should throw an error for invalid stage id', async () => {
      const errorFunction = async () => {
        await orderService.getOrdersByStage('invalid', {
          pageNumber: 1,
          perPage: 1,
          date: new Date('2023-09-01'),
          sortBy,
        });
      };

      expect(errorFunction()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Delete order', () => {
    it('should delete an order', async () => {
      const orderResponse = await orderService.deleteOrder(orderDto.id);
      const order = orderResponse;

      expect(order).toStrictEqual(orderDto.id);
    });

    it('should throw an bad request when deleting an past order', async () => {
      const newOrder = {
        ...orderRequestToFail,
        passCount: {
          adults: 1,
          children: 0,
        },
      };
      const orderResponse = await orderService.createOrder(newOrder, userDto.id);
      try {
        await orderService.deleteOrder(orderResponse.id);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw an error for invalid order id when delete an order', async () => {
      const errorFunction = async () => {
        await orderService.deleteOrder('invalid');
      };

      expect(errorFunction()).rejects.toThrow(InternalServerErrorException);
    });

    it('should cancel orders by user id', async () => {
      const expected = 'CANCELLED';
      const orderResponse = await orderService.cancelOrdersByUserId(userDto.id);

      expect(orderResponse[0].status).toStrictEqual(expected);
    });

    it('should throw an error for invalid order id when delete orders by user id', async () => {
      const errorFunction = async () => {
        await orderService.cancelOrdersByUserId('invalid');
      };

      expect(errorFunction()).rejects.toThrow(InternalServerErrorException);
    });

    it('should check permission for create order', async () => {
      const userPermission = await userService.getUserPermissions(userDto.role_id);

      const response = await orderService.checkPermissionToCreateOrder(userPermission);
      expect(response).toBe(true);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: stageDto.id } });
    await prisma.user.delete({ where: { id: userDto.id } });
    await prisma.$disconnect();
  });
});
