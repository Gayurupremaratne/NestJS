import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { StaticContentService } from '../static-content/static-content.service';
import { FcmTokenDto } from './dto/fcm-token.dto';
import { FcmTokensService } from './fcm-tokens.service';

describe('FcmTokensService Tests', () => {
  let fcmTokenService: FcmTokensService;
  let prisma: PrismaService;
  let userService: UserService;
  const randUUID = uuidv4();

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const createUserDto: CreateUserDto = {
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

  const fcmTokenDto: FcmTokenDto = {
    id: uuidv4(),
    userId: createUserDto.id,
    token: 'test_token_1',
    deviceToken: 'test_device_token_1',
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

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        UserService,
        FcmTokensService,
        PrismaService,
        PassesService,
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
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    userService = moduleRef.get(UserService);
    fcmTokenService = moduleRef.get(FcmTokensService);

    await userService.createUser(createUserDto);
  });

  it('should be defined', () => {
    expect(fcmTokenService).toBeDefined();
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create Fcm token for a specific user', () => {
    it('should create Fcm token for a specific user', async () => {
      const createdFcmToken = await fcmTokenService.createFcmToken(fcmTokenDto.userId, fcmTokenDto);
      expect(createdFcmToken).toStrictEqual(fcmTokenDto);
    });

    it('should fail to create Fcm token for a specific user', async () => {
      try {
        await fcmTokenService.createFcmToken(null, fcmTokenDto);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should update existing record if the deviceToken already is taken by same user', async () => {
      const mockUpdateFcmToken = jest.spyOn(fcmTokenService, 'updateFcmToken');

      const upsertToken = await fcmTokenService.createFcmToken(fcmTokenDto.userId, fcmTokenDto);

      expect(mockUpdateFcmToken).toHaveBeenCalled();
      expect(upsertToken).toStrictEqual(fcmTokenDto);
    });

    it('should fail to update existing record if the deviceToken already is taken by same user', async () => {
      try {
        await fcmTokenService.createFcmToken(fcmTokenDto.userId, fcmTokenDto);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Get Fcm token for a specific user', () => {
    it('should be able to get Fcm token for a specific user', async () => {
      const getFcmToken = await fcmTokenService.getFcmTokensByUserId(fcmTokenDto.userId);
      expect(getFcmToken).toStrictEqual([fcmTokenDto]);
    });

    it('should be faild to able to get Fcm token for a specific user', async () => {
      try {
        await fcmTokenService.getFcmTokensByUserId(null);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Delete Fcm token for a specific user', () => {
    it('should be able to delete Fcm token for a specific user', async () => {
      const deletedFcmToken = await fcmTokenService.removeAllFcmTokensByUserId(fcmTokenDto.userId);
      expect(deletedFcmToken).toStrictEqual({ count: 1 });
    });

    it('should be failed to able to delete Fcm token for a specific user', async () => {
      try {
        await fcmTokenService.removeAllFcmTokensByUserId(null);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: createUserDto.email } });
    await prisma.$disconnect();
  });
});
