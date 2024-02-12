import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { User } from '@prisma/client';
import { UserDelete } from '@user/dto/user-delete.dto';
import { UserDto } from '@user/dto/user.dto';
import { UserRepository } from '@user/user.repository';
import { Job, Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { MailConsumer } from '../../../../worker/mail/mail.consumer';
import { KeycloakUserDto } from '../../../keycloak/dto/keycloak-user.dto';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { OrderService } from '../../../order/order.service';
import { UserQueueConsumer } from '../user-queue.consumer';
import { UserQueuePublisher } from '../user-queue.publisher';

describe('User Publisher Service', () => {
  let publisher: UserQueuePublisher;
  let consumer: UserQueueConsumer;
  let prisma: PrismaService;
  let createdUser: User;
  const userId = uuidv4();

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    changePassword: jest.fn(),
    getUser: jest.fn(() => Promise.resolve<UserDto>({} as UserDto)),
  };

  const mockUserRepo = {
    scheduleUserForDeletion: jest.fn(),
    getUser: jest.fn(() => Promise.resolve<KeycloakUserDto>({} as KeycloakUserDto)),
    updateUser: jest.fn(),
  };

  const mockOrderService = {
    cancelOrdersByUserId: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserQueuePublisher,
        { provide: getQueueToken(QUEUES.USER_DELETE), useValue: mockQueue },
        UserQueueConsumer,
        PrismaService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        ConfigService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: OrderService, useValue: mockOrderService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();
    prisma = module.get(PrismaService);
    publisher = module.get<UserQueuePublisher>(UserQueuePublisher);
    consumer = module.get<UserQueueConsumer>(UserQueueConsumer);

    const newUser = await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
      },
    });

    createdUser = Object.assign({}, newUser);
  });

  it('should be defined', () => {
    expect(publisher).toBeDefined();
  });

  it('should delete user', async () => {
    const cronJobSpy = jest.spyOn(publisher, 'cronJobUserDeletion');
    const consumerSpy = jest.spyOn(consumer, 'deleteUser');

    const payload: UserDelete = {
      id: uuidv4(),
    };
    consumer.deleteUser({ data: payload } as unknown as Job<UserDelete>);

    await publisher.cronJobUserDeletion();

    expect(cronJobSpy).toHaveBeenCalled();
    expect(consumerSpy).toHaveBeenCalledWith({ data: payload });
  });

  it('should push user to delete queue', async () => {
    const deleteQueueSpy = jest.spyOn(publisher, 'pushUsersToDeleteQueue');
    const user: UserDelete = { id: userId };
    const payload: UserDelete[] = [user];

    const result = await publisher.pushUsersToDeleteQueue(payload);

    expect(deleteQueueSpy).toHaveBeenCalled();
    expect(result).toStrictEqual(payload);
  });

  it('Should delete user', async () => {
    const userDeleteRequest: UserDelete = { id: createdUser?.id };
    const result = await publisher.scheduleDeleteUser(userDeleteRequest);
    expect(result).toBe(userDeleteRequest);
  });

  it('Should throw error for invalid user id', async () => {
    const invalidData = { data: { id: 'invalid-id' } } as unknown as Job<UserDelete>;
    jest.spyOn(mockUserRepo, 'getUser').mockRejectedValue(new NotFoundException('User not found'));
    await expect(consumer.deleteUser(invalidData)).rejects.toBeInstanceOf(Error);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
