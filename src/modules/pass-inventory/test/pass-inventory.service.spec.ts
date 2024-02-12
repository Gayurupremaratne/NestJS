import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { StageService } from '../../stage/stage.service';
import { StageDto } from '../../stage/dto/stage.dto';
import { StageRepository } from '../../stage/stage.repository';
import { StageTranslationService } from '../../stage/stage-translation/stage-translation.service';
import { StageTranslationRepository } from '../../stage/stage-translation/stage-translation.repository';
import { CreateStageDto } from '../../stage/dto/create-stage.dto';
import {
  QUEUES,
  STAGE_DIFFICULTY_TYPES,
  STAGE_DIFFICULTY_TYPE_CODE,
  STATUS_CODE,
} from '@common/constants';
import { PassInventoryService } from '../pass-inventory.service';
import { PassInventoryDto } from '../dto/pass-inventory.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  UnprocessableEntityException,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import { MailService } from '../../mail/mail.service';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { RoleType } from '@common/constants/role_type.constants';
import { REGISTRATION_STATUS } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { OrderRepository } from '../../order/order.repository';
import { PassesService } from '../../passes/passes.service';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';

describe('PassInventoryService', () => {
  let prisma: PrismaService;
  let stageService: StageService;
  let passInventoryService: PassInventoryService;
  let createdStage: StageDto;
  let createdPassInventory: PassInventoryDto;
  let orderRepository: OrderRepository;

  const stageToCreate: CreateStageDto = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    number: 1,
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

  const passInventoryToCreate = {
    quantity: 100,
    date: new Date('2019-04-28'),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        StageService,
        PassInventoryService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        OrderRepository,
        PassesService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    stageService = moduleRef.get(StageService);
    passInventoryService = moduleRef.get(PassInventoryService);
    orderRepository = moduleRef.get(OrderRepository);

    const response = await stageService.createStage(stageToCreate);
    createdStage = Object.assign({}, response);

    const passInventory = {
      ...passInventoryToCreate,
      stageId: createdStage.id,
    };

    const passInventoryResponse = await passInventoryService.create(passInventory);
    createdPassInventory = Object.assign({}, passInventoryResponse);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create pass inventory', () => {
    it('should create a pass inventory', async () => {
      const passInventory = {
        ...passInventoryToCreate,
        stageId: createdStage.id,
      };

      const response = await passInventoryService.create(passInventory);
      const transformed = Object.assign({}, response);
      delete transformed.id;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      expect(transformed).toEqual(passInventory);
    });

    it('should throw if the quantity is negetive', async () => {
      const passInventory = {
        ...passInventoryToCreate,
        quantity: -1,
        stageId: createdStage.id,
      };

      async function asyncFunctionThatThrowsError() {
        await passInventoryService.create(passInventory);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw if the date is invalid', async () => {
      const passInventory = {
        ...passInventoryToCreate,
        date: new Date('Invalid date'),
        stageId: createdStage.id,
      };

      async function asyncFunctionThatThrowsError() {
        await passInventoryService.create(passInventory);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Get pass inventory', () => {
    it('should get pass inventory', async () => {
      const expectedPassInventory = {
        ...passInventoryToCreate,
        stageId: createdStage.id,
      };

      const retrievedPassInventory = await passInventoryService.findOne(createdPassInventory.id);
      const transformedPassInventory = retrievedPassInventory;
      delete transformedPassInventory.id;
      delete transformedPassInventory.createdAt;
      delete transformedPassInventory.updatedAt;
      expect(transformedPassInventory).toEqual({
        ...expectedPassInventory,
      });
    });

    it('should throw if the pass inventory does not exist', async () => {
      async function asyncFunctionThatThrowsError() {
        await passInventoryService.findOne('65b9488c-6eef-496c-8caf-85195a0c7222');
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(NotFoundException);
    });
  });

  describe('Get pass inventory by month', () => {
    it('should get pass inventory by month', async () => {
      const retrievedPassInventory = await passInventoryService.findPassInventoryByMonth(
        createdStage.id,
        4,
        2019,
      );
      expect(retrievedPassInventory.data.length).toBeGreaterThan(0);
    });

    it('should throw if the pass inventory does not exist', async () => {
      async function asyncFunctionThatThrowsError() {
        await passInventoryService.findPassInventoryByMonth('invalid', 4, 2019);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe('Get pass inventory allocation by month', () => {
    it('should get pass inventory allocation by month', async () => {
      const retrievedPassInventory = await passInventoryService.findPassInventoryAllocationByMonth(
        createdStage.id,
        4,
        2019,
      );
      expect(retrievedPassInventory.length).toBeGreaterThan(0);
    });

    it('should throw if the pass inventory does not exist', async () => {
      async function asyncFunctionThatThrowsError() {
        await passInventoryService.findPassInventoryAllocationByMonth('invalid', 4, 2019);
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe('Update pass inventory', () => {
    it('should update pass inventory quantity', async () => {
      const response = await passInventoryService.updateInventoriesByBatch(createdStage.id, {
        startDate: new Date('2019-04-28'),
        endDate: new Date('2019-04-30'),
        quantity: 50,
        stageClosure: false,
      });
      expect(response).toBeInstanceOf(Array);
    });

    it('should update pass inventory quantity to reserved quantity if quantity is less than reserved quantity', async () => {
      const createUserDto: CreateUserDto = {
        id: uuidv4(),
        firstName: 'test',
        lastName: 'test',
        email: `test${uuidv4()}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: new Date().toISOString(),
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.COMPLETE],
        profileImageKey: null,
        role_id: RoleType.SuperAdmin,
      };
      await prisma.user.create({ data: createUserDto });

      await orderRepository.createOrder(
        {
          stageId: createdStage.id,
          reservedFor: new Date('2019-04-28'),
          passCount: {
            adults: 3,
            children: 2,
          },
        },
        createUserDto.id,
      );

      async function asyncFunctionThatThrowsError() {
        await passInventoryService.updateInventoriesByBatch(createdStage.id, {
          startDate: new Date('2019-04-28'),
          endDate: new Date('2019-04-28'),
          quantity: 1,
          stageClosure: false,
        });
      }

      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(HttpException);
    });

    it('should throw if the pass inventory does not exist', async () => {
      async function asyncFunctionThatThrowsError() {
        await passInventoryService.updateInventoriesByBatch('invalid', {
          startDate: new Date('2019-04-28'),
          endDate: new Date('2019-04-28'),
          quantity: 50,
          stageClosure: false,
        });
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(PrismaClientKnownRequestError);
    });

    it('should throw if the quantity is negetive', async () => {
      async function asyncFunctionThatThrowsError() {
        await passInventoryService.updateInventoriesByBatch(createdStage.id, {
          startDate: new Date('2019-04-28'),
          endDate: new Date('2019-04-28'),
          quantity: -1,
          stageClosure: false,
        });
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(UnprocessableEntityException);
    });

    it('should notifiy user if stage is closed', async () => {
      jest.spyOn(passInventoryService, 'notifyStageClosure').mockResolvedValueOnce(null);

      async function asyncFunctionThatThrowsError() {
        await passInventoryService.updateInventoriesByBatch(createdStage.id, {
          startDate: new Date('2019-04-28'),
          endDate: new Date('2019-04-28'),
          quantity: 0,
          stageClosure: true,
          stageClosureReason: 'Bad weather',
        });
      }
      await expect(asyncFunctionThatThrowsError()).rejects.toThrow(HttpException);
    });

    it('should send email notifications to users with correct data', async () => {
      const prismaServiceMock = {
        $queryRaw: jest.fn().mockResolvedValue([
          {
            userId: 'user1',
            orderId: 'order1',
            orderedDate: new Date(),
            passType: 'adult',
            passQuantity: 2,
            stageTail: 'Tail 1',
            stageHead: 'Head 1',
            stageNumber: 1,
          },
        ]),
        passes: {
          findMany: jest.fn().mockResolvedValue([
            {
              user: {
                email: 'user1@example.com',
                firstName: 'John',
                lastName: 'Doe',
              },
              passId: 'pass1',
            },
          ]),
          updateMany: jest.fn(),
        },
        orders: {
          update: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((callback) => callback(prismaServiceMock)),
      };

      const mailServiceMock = {
        sendMail: jest.fn(),
      };

      const configServiceMock = {
        get: jest.fn().mockResolvedValue({ CDN_URL: 'https://cdn.example.com' }),
      };

      const passInventoryService = new PassInventoryService(
        prismaServiceMock as any,
        mailServiceMock as any,
        configServiceMock as any,
      );

      const stageClosureArray = [
        {
          stageId: 'stage1',
          closedDate: new Date(),
          data: [
            {
              id: 'closure1',
              reason: 'Closure Reason 1',
            },
          ],
        },
      ];

      await passInventoryService.notifyStageClosure(stageClosureArray as any);

      expect(prismaServiceMock.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.$disconnect();
  });
});
