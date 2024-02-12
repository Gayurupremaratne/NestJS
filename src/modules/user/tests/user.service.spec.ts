import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import { Test } from '@nestjs/testing';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { CreateAssetDto } from '../../static-content/dto/create-asset.dto';
import { StaticContentService } from '../../static-content/static-content.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserDto } from '../dto/user.dto';
import { UserRepository } from '../user.repository';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';
import { NotificationStatus } from '@user/dto/profile.dto';
import { CreateRoleDto } from '../../role/dto/create-role.dto';
import { PermissionsService } from '../../permissions/permissions.service';

describe('UserService Tests', () => {
  let permissionService: PermissionsService;
  let prisma: PrismaService;
  let userService: UserService;
  const randUUID = uuidv4();
  let createdUser: UserDto;
  let updatedUser: UserDto;
  let adminUser: UserDto;
  let createdAssetKey1: CreateAssetDto;
  const fileKey1 = `profile_media/${uuidv4()}.jpg`;
  const fileKey2 = `profile_media/${uuidv4()}.jpg`;

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
    deleteUser: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        UserService,
        PrismaService,
        UserRepository,
        PassesService,
        PermissionsService,
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

    permissionService = moduleRef.get(PermissionsService);
    prisma = moduleRef.get(PrismaService);
    userService = moduleRef.get(UserService);

    createdAssetKey1 = await prisma.assetKeys.create({
      data: { fileKey: fileKey1, module: 'test' },
    });

    await prisma.assetKeys.create({
      data: { fileKey: fileKey2, module: 'test' },
    });

    //create admin user
    const createAdminUserDto: CreateUserDto = {
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

    adminUser = await prisma.user.create({ data: createAdminUserDto });
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create User()', () => {
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
      registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
      profileImageKey: fileKey1,
    };

    it('should create user', async () => {
      const newUser = await userService.createUser(createUserDto);
      createdUser = Object.assign({}, newUser);
      expect(newUser.email).toBe(`test${randUUID}@gmail.com`);
    });

    it('should throw on duplicate email', async () => {
      try {
        await userService.createUser(createUserDto);
      } catch (error) {
        expect(error.status).toBe(422);
      }
    });
  });

  describe('Update User()', () => {
    it('should update user', async () => {
      const updateUserDto: UpdateUserDto = {
        id: createdUser?.id,
        firstName: 'updatedFirstName',
        lastName: 'updatedLastName',
        email: createdUser?.email,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
        profileImageKey: fileKey2,
      };

      updatedUser = await userService.updateUser(updateUserDto.id, updateUserDto);
      expect(updatedUser.id).toBe(updateUserDto.id);
      expect(updatedUser.firstName).toBe('updatedFirstName');
      expect(updatedUser.lastName).toBe('updatedLastName');
      expect(updatedUser.profileImageKey).toBe(fileKey2);
    });

    it('should get emergency status when pending social and email verified', async () => {
      const updateUserDto: UpdateUserDto = {
        id: updatedUser.id,
        firstName: 'updatedFirstName',
        lastName: 'updatedLastName',
        email: updatedUser.email,
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67845',
        nicNumber: '950370203V',
        dateOfBirth: '2000-08-08',
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
      };

      await prisma.user.update({
        where: { id: updatedUser.id },
        data: {
          emailVerified: true,
        },
      });

      const user = await userService.updateUser(updateUserDto.id, updateUserDto);

      expect(user.registrationStatus).toBe(REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY]);
    });

    it('Should validate admin user update', async () => {
      const userIdToUpdate = await userService.validateUpdateUserPermission(adminUser.id);
      expect(userIdToUpdate).toBeTruthy();
    });

    it('Should validate admin user update with permission update', async () => {
      const role: CreateRoleDto = {
        name: `test4${uuidv4()}`,
      };
      const newCreatedRole = await prisma.role.create({
        data: { ...role, id: 1004 },
      });
      const body = [
        {
          id: uuidv4(),
          permissionId: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          roleId: newCreatedRole.id,
        },
      ];

      await permissionService.assignPermissionsToRole(body);

      //create admin user
      const createAdminUserDto: CreateUserDto = {
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
        role_id: newCreatedRole.id,
      };

      const adminUser3 = await prisma.user.create({ data: createAdminUserDto });

      const userIdToDelete = await userService.validateUpdateUserPermission(adminUser3.id);
      expect(userIdToDelete).toBeTruthy();
      await prisma.user.delete({ where: { email: adminUser3.email } });
      await prisma.role.delete({ where: { id: newCreatedRole.id } });
    });

    it('Should validate admin user update with permission user manange', async () => {
      const role: CreateRoleDto = {
        name: `test3${uuidv4()}`,
      };
      const newCreatedRole = await prisma.role.create({
        data: { ...role, id: 1005 },
      });
      const body = [
        {
          id: uuidv4(),
          permissionId: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          roleId: newCreatedRole.id,
        },
      ];

      await permissionService.assignPermissionsToRole(body);

      //create admin user
      const createAdminUserDto: CreateUserDto = {
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
        role_id: newCreatedRole.id,
      };

      const adminUser4 = await prisma.user.create({ data: createAdminUserDto });

      const userIdToDelete = await userService.validateUpdateUserPermission(adminUser4.id);
      expect(userIdToDelete).toBeTruthy();
      await prisma.user.delete({ where: { email: adminUser4.email } });
      await prisma.role.delete({ where: { id: newCreatedRole.id } });
    });
  });

  describe('Change Password', () => {
    it('Should return user', async () => {
      const user = await userService.getUser(createdUser?.id);
      expect(user.email).toBe(`test${randUUID}@gmail.com`);
    });

    it('Should change user password', async () => {
      const user = await userService.getUser(createdUser?.id);
      expect(user.email).toBe(`test${randUUID}@gmail.com`);
      const data: ChangePasswordDto = {
        currentPassword: 'Test@123',
        newPassword: 'Test@1234',
      };

      const response = await userService.changePassword(createdUser?.id, data);

      expect(response).toMatchObject(user);
    });
    it('should throw an error', async () => {
      const incorrectPassword: ChangePasswordDto = {
        currentPassword: 'Test@1234',
        newPassword: 'Test@12',
      };
      try {
        await userService.changePassword(createdUser?.id, incorrectPassword);
      } catch (error) {
        expect(error.status).toBe(422);
      }
    });
  });

  describe('Get Users', () => {
    it('Get users by email', async () => {
      const userByEmail = await userService.getUserByEmail(createdUser?.email);
      expect(userByEmail[0].email).toBe(createdUser?.email);
    });

    it('should get all users', async () => {
      const response = await userService.getAllUsers({
        pageNumber: 1,
        perPage: 10,
        search: '',
      });

      expect(response).toBeTruthy();
    });

    it('should get all users by roleId', async () => {
      const response = await userService.getUsersByRoleId(RoleType.SuperAdmin, {
        perPage: 10,
        pageNumber: 1,
      });

      expect(response).toBeTruthy();
    });

    it('should get all users by roleId serach by email', async () => {
      const response = await userService.getUsersByRoleId(RoleType.SuperAdmin, {
        perPage: 10,
        pageNumber: 1,
        search: 'test',
      });

      expect(response).toBeTruthy();
    });

    it('should get users notifications', async () => {
      const res: NotificationStatus = {
        stage: false,
        all: false,
      };
      const data = await userService.getUserNotificationStatus(createdUser.id);
      expect(data).toEqual(res);
    });
  });

  describe('User Deletion', () => {
    it('Should validate admin user deletion', async () => {
      const userIdToDelete = await userService.validateAdminUserDelete(adminUser.id);
      expect(userIdToDelete).toBeTruthy();
    });

    it('Should validate admin user deletion with permission delete', async () => {
      const role: CreateRoleDto = {
        name: `test${uuidv4()}`,
      };
      const newCreatedRole = await prisma.role.create({
        data: { ...role, id: 1001 },
      });
      const body = [
        {
          id: uuidv4(),
          permissionId: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          roleId: newCreatedRole.id,
        },
      ];

      await permissionService.assignPermissionsToRole(body);

      //create admin user
      const createAdminUserDto: CreateUserDto = {
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
        role_id: newCreatedRole.id,
      };

      const adminUser2 = await prisma.user.create({ data: createAdminUserDto });

      const userIdToDelete = await userService.validateAdminUserDelete(adminUser2.id);
      expect(userIdToDelete).toBeTruthy();
      await prisma.user.delete({ where: { email: adminUser2.email } });
      await prisma.role.delete({ where: { id: newCreatedRole.id } });
    });

    it('Should validate admin user deletion with permission user manage', async () => {
      const role: CreateRoleDto = {
        name: `test5${uuidv4()}`,
      };
      const newCreatedRole = await prisma.role.create({
        data: { ...role, id: 1002 },
      });
      const body = [
        {
          id: uuidv4(),
          permissionId: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          roleId: newCreatedRole.id,
        },
      ];

      await permissionService.assignPermissionsToRole(body);

      //create admin user
      const createAdminUserDto: CreateUserDto = {
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
        role_id: newCreatedRole.id,
      };

      const adminUser1 = await prisma.user.create({ data: createAdminUserDto });

      const userIdToDelete = await userService.validateAdminUserDelete(adminUser1.id);
      expect(userIdToDelete).toBeTruthy();
      await prisma.user.delete({ where: { email: adminUser1.email } });
      await prisma.role.delete({ where: { id: newCreatedRole.id } });
    });
  });

  afterAll(async () => {
    await prisma.assetKeys.delete({ where: { id: createdAssetKey1.id } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: updatedUser.email } });
    await prisma.$disconnect();
  });
});
