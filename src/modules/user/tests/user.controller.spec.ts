import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { CustomAuthRequest, JsonResponse } from '@common/types';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ForbiddenException, INestApplication, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDelete } from '@user/dto/user-delete.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../../common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { OrderRepository } from '../../order/order.repository';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { CreateAssetDto } from '../../static-content/dto/create-asset.dto';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserEmail } from '../dto/user-email.dto';
import { UserIdentifierDto } from '../dto/user-get-params.dto';
import { UserDto } from '../dto/user.dto';
import { UserController } from '../user.controller';
import { UserRepository } from '../user.repository';
import { PushNotificationService } from '../../push-notification/push-notification.service';
import { RoleType } from '@common/constants/role_type.constants';
import { CreateUserAdminDto } from '@user/dto/create-user-admin.dto';

describe('UserController', () => {
  let app: INestApplication;
  let userController: UserController;
  const randUUID = uuidv4();
  let createdUser: UserDto;
  let prisma: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;
  let createdAssetKey: CreateAssetDto;
  let fileKey: string;
  let userService: UserService;

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
    contactNumberNationalityCode: 'LK',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    scheduleDeleteUser: jest.fn(),
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
      controllers: [UserController],
      providers: [
        StaticContentRepository,
        UserService,
        PrismaService,
        PassesService,
        UserRepository,
        NoticeRepository,
        NoticeService,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        StageService,
        StageRepository,
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: KeycloakService, useValue: mockKeycloakService },
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
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userController = module.get<UserController>(UserController);
    prisma = module.get(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    userService = module.get<UserService>(UserService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
    const userResponse = await userService.createUser(userRequest);
    createdUser = Object.assign({}, userResponse);

    //Create asset key record before user test execution
    fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: 'test' },
    });
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('Update user', () => {
    it('should update a user web', async () => {
      const updateUserRequest = createdUser;
      updateUserRequest.firstName = 'test2';

      const mockUser = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
      };

      const mockRequest = {
        user: {
          sub: updateUserRequest.id,
        },
      };

      const expected = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: new Date('2000-08-08T00:00:00.000Z'),
        isApple: false,
        isFacebook: false,
        isGoogle: false,
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      const response = await userController.updateUser(
        mockRequest as unknown as CustomAuthRequest,
        mockUser,
      );
      const userResponseData = response.data;
      delete userResponseData.createdAt;
      delete userResponseData.updatedAt;

      expect(userResponseData).toEqual(expect.objectContaining(expected));
    });

    it('should give an forbidden exception in update user', async () => {
      const createNewUser: CreateUserAdminDto = {
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
        role_id: RoleType.Hiker,
      };

      const newUser = await prisma.user.create({ data: createNewUser });

      const updateUserRequest = createdUser;
      updateUserRequest.firstName = 'test2';

      const mockUser = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
      };

      const mockRequest = {
        user: {
          sub: newUser.id,
        },
      };

      try {
        await userController.updateUser(mockRequest as unknown as CustomAuthRequest, mockUser);
      } catch (error) {
        // Ensure the error is an ForbiddenException
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should update a user web admin', async () => {
      //create admin user
      const createAdminUserDto: CreateUserAdminDto = {
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

      const adminUser = await prisma.user.create({ data: createAdminUserDto });

      const updateUserRequest = createdUser;
      updateUserRequest.firstName = 'test2';

      const mockUser = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
      };

      const mockRequest = {
        user: {
          sub: adminUser.id,
        },
      };

      const expected = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: new Date('2000-08-08T00:00:00.000Z'),
        isApple: false,
        isFacebook: false,
        isGoogle: false,
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      const response = await userController.updateUser(
        mockRequest as unknown as CustomAuthRequest,
        mockUser,
      );
      const userResponseData = response.data;
      delete userResponseData.createdAt;
      delete userResponseData.updatedAt;

      expect(userResponseData).toEqual(expect.objectContaining(expected));
    });

    it('should thrw an error when hiker changes the role', async () => {
      const updateUserRequest = createdUser;
      updateUserRequest.firstName = 'test2';

      const mockUser = {
        id: updateUserRequest.id,
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
        role_id: RoleType.SuperAdmin,
      };

      const mockRequest = {
        user: {
          sub: updateUserRequest.id,
        },
      };

      try {
        await userController.updateUser(mockRequest as unknown as CustomAuthRequest, mockUser);
      } catch (error) {
        // Ensure the error is an ForbiddenException
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should update a user web admin role', async () => {
      //create admin user
      const createAdminUserDto: CreateUserAdminDto = {
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
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        role_id: RoleType.SuperAdmin,
      };

      const adminUser = await prisma.user.create({ data: createAdminUserDto });

      const mockUser = {
        id: adminUser.id,
        firstName: 'test',
        lastName: 'test',
        email: adminUser.email,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        role_id: RoleType.SuperAdmin,
      };

      const mockRequest = {
        user: {
          sub: adminUser.id,
        },
      };

      const expected = {
        id: adminUser.id,
        firstName: 'test',
        lastName: 'test',
        email: adminUser.email,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: new Date('2000-08-08T00:00:00.000Z'),
        isApple: false,
        isFacebook: false,
        isGoogle: false,
        preferredLocaleId: 'en',
        contactNumberNationalityCode: 'LK',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        deletionDate: null,
        emailOtpSentAt: null,
        emailVerified: false,
        isDeleted: false,
        role_id: RoleType.SuperAdmin,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      const response = await userController.updateUser(
        mockRequest as unknown as CustomAuthRequest,
        mockUser,
      );
      const userResponseData = response.data;
      delete userResponseData.createdAt;
      delete userResponseData.updatedAt;
      delete userResponseData.loginAt;

      expect(userResponseData.id).toEqual(expected.id);
    });

    it('should throw an error when changing the role of a super admin to a hiker', async () => {
      //create admin user
      const createAdminUserDto: CreateUserAdminDto = {
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
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        role_id: RoleType.SuperAdmin,
      };

      const adminUser = await prisma.user.create({ data: createAdminUserDto });

      const createNewUserDto: CreateUserAdminDto = {
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
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        role_id: RoleType.SuperAdmin,
      };

      const adminNewUser = await prisma.user.create({ data: createNewUserDto });

      const mockUser = {
        id: adminNewUser.id,
        firstName: 'test',
        lastName: 'test',
        email: adminNewUser.email,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08T00:00:00.000Z',
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: null,
        role_id: RoleType.Hiker,
      };

      const mockRequest = {
        user: {
          sub: adminUser.id,
        },
      };

      try {
        await userController.updateUser(mockRequest as unknown as CustomAuthRequest, mockUser);
      } catch (error) {
        // Ensure the error is an ForbiddenException
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('Get user', () => {
    it('should return user', async () => {
      const reqUser: UserIdentifierDto = {
        id: createdUser.id,
      };
      const response: JsonResponse<UserDto> = await userController.getUser(reqUser);

      const expected = {
        firstName: 'test2',
        lastName: 'test2',
        email: `test${randUUID}@gmail.com`,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumberNationalityCode: 'LK',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: new Date('2000-08-08T00:00:00.000Z'),
        isApple: false,
        isFacebook: false,
        isGoogle: false,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        profileImageKey: createdAssetKey.fileKey,
        emailVerified: false,
        deletionDate: null,
        isDeleted: false,
      };

      const transformed = response.data;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      delete transformed.role_id;
      delete transformed.role;
      delete transformed.userFavouriteStages;
      delete transformed.emailOtpSentAt;
      delete transformed.loginAt;

      expect(transformed).toEqual(expected);
    });

    it('should get all users', async () => {
      const response = await userController.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: '',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users by search', async () => {
      const response = await userController.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: 'test',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users sorted by firstName', async () => {
      const response = await userController.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: '',
        sortBy: 'firstName',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users sorted by role', async () => {
      const response = await userController.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: '',
        sortBy: 'role',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users sorted by a non existing field', async () => {
      const response = await userController.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: '',
        sortBy: 'nonExistingField',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users by role', async () => {
      const response = await userController.getUsersByRoleId(
        { id: 1 },
        {
          pageNumber: 1,
          perPage: 10,
          search: '',
        },
      );

      expect(response).toBeTruthy();
    });
    it('should get all users by role by search', async () => {
      const response = await userController.getUsersByRoleId(
        { id: 1 },
        {
          pageNumber: 1,
          perPage: 10,
          search: 'test',
        },
      );

      expect(response).toBeTruthy();
    });
  });

  describe('Change Password', () => {
    it('Should change user password', async () => {
      const data: ChangePasswordDto = {
        currentPassword: 'Test@123',
        newPassword: 'Test@1234',
      };

      const response: JsonResponse<UserDto> = await userController.changePassword(
        { sub: createdUser.id },
        data,
      );
      expect(response).toBeTruthy();
    });
  });

  describe('Get users by email', () => {
    it('should return user', async () => {
      const reqUser = {
        email: createdUser.email,
      };
      const response: JsonResponse<UserEmail[]> = await userController.getUserByEmail(reqUser);

      expect(response).toBeTruthy();
    });
  });

  describe('Delete user', () => {
    it('should delete user via mobile', async () => {
      const authUser = {
        sub: createdUser.id,
      };
      const userDeleteReq: UserDelete = {
        id: createdUser.id,
      };
      const response: JsonResponse<UserDelete> | InternalServerErrorException =
        await userController.deleteUser(userDeleteReq, authUser);
      expect(response).toBeTruthy();
    });

    it('should give an internal server error', async () => {
      const authUser = {
        sub: createdUser.id,
      };
      const userDeleteReq: UserDelete = {
        id: uuidv4(),
      };
      try {
        await userController.deleteUser(userDeleteReq, authUser);
      } catch (error) {
        // Ensure the error is an InternalServerErrorException
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it('should delete user via web', async () => {
      //create admin user
      const createAdminUserDto: CreateUserAdminDto = {
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

      const adminUser = await prisma.user.create({ data: createAdminUserDto });

      const authUser = {
        sub: adminUser.id,
      };
      const userDeleteReq: UserDelete = {
        id: createdUser.id,
      };
      const response: JsonResponse<UserDelete> | InternalServerErrorException =
        await userController.deleteUser(userDeleteReq, authUser);
      expect(response).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: createdUser.email } });
    await prisma.$disconnect();
    await app.close();
  });
});
