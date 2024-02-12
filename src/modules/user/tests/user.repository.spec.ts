import { QUEUES, STATUS_CODE } from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REGISTRATION_STATUS } from '@prisma/client';
import { NotificationStatus } from '@user/dto/profile.dto';
import { QueryParamsDto } from '@user/dto/query-params.dto';
import { UserDto } from '@user/dto/user.dto';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository } from '../user.repository';

describe('User Repository', () => {
  let repository: UserRepository;
  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    logout: jest.fn(),
  };
  let prisma: PrismaService;
  let createdUser: UserDto;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const updateUserDto: UpdateUserDto = {
    id: uuidv4(),
    firstName: 'updatedFirstName',
    lastName: 'updatedLastName',
    email: 'test@gmail.com',
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
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
        ConfigService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    repository = module.get<UserRepository>(UserRepository);

    //create admin user
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

    createdUser = await prisma.user.create({ data: createUserDto });
  });

  it('should throw exception get user for invalid user id', async () => {
    try {
      await repository.getUser(uuidv4());
    } catch (error) {
      expect(error.response.message).toBe('User not found');
      expect(error.status).toBe(404);
    }
  });

  it('should throw exception on create user for invalid id', async () => {
    const createUser: CreateUserDto = {
      id: uuidv4(),
      firstName: 'test1',
      lastName: 'test2',
      email: `test@gmail.com`,
      nationalityCode: 'FR',
      countryCode: '+33',
      contactNumber: '123456789',
      passportNumber: '78TH67845',
      nicNumber: '950370203V',
      dateOfBirth: '2000-08-08',
      preferredLocaleId: 'invalid',
      registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
    };
    try {
      await repository.createUser(createUser);
    } catch (error) {
      expect(error.response.message).toBe('Internal Server Error');
      expect(error.status).toBe(500);
    }
  });

  it('should throw exception on update user for invalid id', async () => {
    try {
      await repository.updateUser(uuidv4(), updateUserDto);
    } catch (error) {
      expect(error.response.message).toBe('Internal Server Error');
      expect(error.status).toBe(500);
    }
  });

  it('should logout user when the roleId changed to banned', async () => {
    try {
      updateUserDto.role_id = RoleType.Banned;
      await repository.updateUser(uuidv4(), updateUserDto);
    } catch (error) {}
  });

  it('should throw exception on getPermissions for invalid id', async () => {
    try {
      await repository.getPermissions(uuidv4());
    } catch (error) {
      expect(error.response.message).toBe('Unable to fetch permissions');
      expect(error.status).toBe(404);
    }
  });

  it('should get users', async () => {
    const params: QueryParamsDto = {
      perPage: 10,
      pageNumber: 1,
      search: '',
    };
    const paginatedMetaResult = {
      total: expect.anything(),
      lastPage: expect.anything(),
      currentPage: 1,
      perPage: 10,
    };
    const response = await repository.getAllUsers(params);
    delete response.meta.prev;
    delete response.meta.next;
    expect(response.meta).toEqual(paginatedMetaResult);
  });

  it('should get users by search', async () => {
    const params: QueryParamsDto = {
      perPage: 10,
      pageNumber: 1,
      search: ` test2`,
    };
    const paginatedMetaResult = {
      total: expect.anything(),
      lastPage: expect.anything(),
      currentPage: 1,
      perPage: 10,
    };
    const response = await repository.getAllUsers(params);
    delete response.meta.prev;
    delete response.meta.next;
    expect(response.meta).toEqual(paginatedMetaResult);
  });

  it('should get users without search', async () => {
    const params: QueryParamsDto = {
      perPage: 10,
      pageNumber: 1,
    };
    const paginatedMetaResult = {
      total: expect.anything(),
      lastPage: expect.anything(),
      currentPage: 1,
      perPage: 10,
    };
    const response = await repository.getAllUsers(params);
    delete response.meta.prev;
    delete response.meta.next;
    expect(response.meta).toEqual(paginatedMetaResult);
  });

  it('should get users by email', async () => {
    const user = await repository.getUsersByEmail(createdUser.email);
    expect(user[0].email).toBe(createdUser.email);
  });

  it('should get users by role id', async () => {
    const params: QueryParamsDto = {
      perPage: 10,
      pageNumber: 1,
      search: '',
    };
    const data = await repository.getUsersByRoleId(RoleType.SuperAdmin, params);
    expect(data.data[0].role_id).toBe(RoleType.SuperAdmin);
  });

  it('should get all active users by notice type', async () => {
    const cursor = 0;
    const users = await repository.getAllActiveUserIds(cursor);
    expect(users).toBeDefined();
  });

  it('should get users by role id search by email', async () => {
    const params: QueryParamsDto = {
      perPage: 10,
      pageNumber: 1,
      search: 'test',
    };
    const data = await repository.getUsersByRoleId(RoleType.SuperAdmin, params);
    expect(data.data[0].role_id).toBe(RoleType.SuperAdmin);
  });

  it('should get users notifications', async () => {
    const res: NotificationStatus = {
      stage: false,
      all: false,
    };

    const data = await repository.getUserNotificationStatus(createdUser.id);
    expect(data).toEqual(res);
  });

  it('should schedule user for deletion', async () => {
    const expectedRole = RoleType.Banned;
    const expectedDate = new Date(0);
    const user = await repository.scheduleUserForDeletion(createdUser.id);
    expect(expectedRole).toBe(user.role_id);
    expect(expectedDate).toStrictEqual(user.loginAt);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: createdUser.email } });
    await prisma.$disconnect();
  });
});
