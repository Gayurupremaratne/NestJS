import { STATUS_CODE } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { REGISTRATION_STATUS } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentService } from '../static-content/static-content.service';
import { EmergencyContactController } from './emergency-contact.controller';
import { EmergencyContactService } from './emergency-contact.service';

describe('EmergencyContactController', () => {
  let controller: EmergencyContactController;
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

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmergencyContactController],
      providers: [
        EmergencyContactService,
        UserService,
        UserRepository,
        PrismaService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
      ],
    }).compile();

    controller = module.get<EmergencyContactController>(EmergencyContactController);

    userService = module.get(UserService);

    await userService.createUser(createUserDto);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockResponse = {
    id: expect.anything(),
    userId: createUserDto.id,
    name: 'Test',
    countryCode: '8617',
    contactNumber: '94770199238',
    relationship: 'MMM',
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
    contactNumberNationalityCode: 'LK',
  };

  describe('Should update emergency contact', () => {
    it('should update logged in user emergency contact', async () => {
      const payload = {
        countryCode: '8617',
        contactNumber: '94770199238',
        name: 'Test',
        relationship: 'MMM',
        contactNumberNationalityCode: 'LK',
      };
      const response = await controller.updateEmergencyContact({ sub: createUserDto.id }, payload);
      expect(response.data).toStrictEqual(mockResponse);
    });

    it('should update requested user emergency contact', async () => {
      const payload = {
        userId: createUserDto.id,
        countryCode: '8617',
        contactNumber: '94770199238',
        name: 'Test',
        relationship: 'MMM',
        contactNumberNationalityCode: 'LK',
      };
      const response = await controller.updateEmergencyContactByUserId(
        { userId: createUserDto.id },
        payload,
      );
      expect(response.data).toStrictEqual(mockResponse);
    });
  });

  describe('Should get emergency contact', () => {
    it('should get emergency contact', async () => {
      const response = await controller.getEmergencyContact({
        sub: createUserDto.id,
      });
      expect(response.data).toMatchObject(mockResponse);
    });

    it('should get emergency contact by userId', async () => {
      const response = await controller.getEmergencyContactByUserId({
        userId: createUserDto.id,
      });
      expect(response.data).toStrictEqual(mockResponse);
    });
  });
});
