import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import {
  BadRequestException,
  INestApplication,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { MailService } from '../../../modules/mail/mail.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { AccountController } from '../account.controller';
import { AccountRepository } from '../account.repository';
import { AccountService } from '../account.service';
import { DeleteAccountConfirm } from '../dto/delete-account-confirm.dto';
import { DeleteAccountRequest } from '../dto/delete-account-request.dto';

describe('Account Service', () => {
  let app: INestApplication;
  let accountService: AccountService;
  let prisma: PrismaService;
  let userService: UserService;
  let createdUser: UserDto;

  const token = uuidv4();
  const expiredToken = uuidv4();

  const userRequest = {
    id: uuidv4(),
    firstName: 'test',
    lastName: 'test',
    email: `test${uuidv4()}@gmail.com`,
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
    scheduleDeleteUser: jest.fn(),
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
      controllers: [AccountController],
      providers: [
        PrismaService,
        PassesService,
        StaticContentService,
        ConfigService,
        UserService,
        StageService,
        UserRepository,
        AccountRepository,
        StaticContentRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        StageRepository,
        PassInventoryService,
        AccountService,
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
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    accountService = module.get<AccountService>(AccountService);
    userService = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);

    createdUser = await userService.createUser(userRequest);

    await prisma.userDeleteRequest.create({
      data: {
        userId: createdUser.id,
        token: token,
        expiredAt: moment().add(5, 'minutes').toISOString(),
      },
    });

    await prisma.userDeleteRequest.create({
      data: {
        userId: createdUser.id,
        token: expiredToken,
        expiredAt: moment().subtract(5, 'minutes').toISOString(),
      },
    });
  });

  describe('delete account', () => {
    it('should create delete user request', async () => {
      const request: DeleteAccountRequest = { email: createdUser.email };
      const response = await accountService.deleteAccountRequest(request);

      expect(response).toEqual({
        userId: createdUser.id,
      });
    });

    it('should fail to create delete user request', async () => {
      const request: DeleteAccountRequest = { email: null };

      try {
        await accountService.deleteAccountRequest(request);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('should confirm delete user request', async () => {
      const request: DeleteAccountConfirm = { userId: createdUser.id, token };
      const response = await accountService.deleteAccountConfirm(request);
      const expected = { userId: createdUser.id, token };
      expect(response).toStrictEqual(expected);
    });

    it('should fail to confirm delete user request', async () => {
      const request: DeleteAccountConfirm = { userId: null, token };

      try {
        await accountService.deleteAccountConfirm(request);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw error for expired token', async () => {
      try {
        const request: DeleteAccountConfirm = { userId: createdUser.id, token: expiredToken };
        await accountService.deleteAccountConfirm(request);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });
});
