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
import { EmergencyContactService } from './emergency-contact.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('EmergencyContactService', () => {
  let service: EmergencyContactService;
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
    contactNumberNationalityCode: 'LK',
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

    service = module.get<EmergencyContactService>(EmergencyContactService);
    userService = module.get(UserService);

    await userService.createUser(createUserDto);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockResponse = {
    id: expect.anything(),
    userId: createUserDto.id,
    name: 'Test',
    countryCode: '8617',
    contactNumber: '94700199238',
    relationship: 'MMM',
    contactNumberNationalityCode: 'LK',
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
  };

  describe('Should update emergency contact', () => {
    it('should update emergency contact', async () => {
      const payload = {
        countryCode: '8617',
        contactNumber: '94700199238',
        name: 'Test',
        relationship: 'MMM',
        contactNumberNationalityCode: 'LK',
      };
      const response = await service.upsertEmergencyContact(createUserDto.id, payload);
      expect(response).toStrictEqual(mockResponse);
    });

    it('should fail emergency contact upsert', async () => {
      const payload = {
        countryCode: '8617',
        contactNumber: '94700199238',
        name: 'Test',
        relationship: 'MMM',
        contactNumberNationalityCode: 'LK',
      };
      try {
        await service.upsertEmergencyContact(null, payload);
      } catch (e) {
        expect(e).toStrictEqual(
          new InternalServerErrorException('Emergency Contact Update Failed'),
        );
      }
    });
  });

  describe('Should get emergency contact', () => {
    it('should get emergency contact', async () => {
      const response = await service.getEmergencyContact(createUserDto.id);
      expect(response).toStrictEqual(mockResponse);
    });

    it('should fail get emergency contact', async () => {
      try {
        await service.getEmergencyContact(null);
      } catch (e) {
        expect(new InternalServerErrorException()).toStrictEqual(
          new InternalServerErrorException(),
        );
      }
    });

    it('should get emergency contact by userId', async () => {
      const response = await service.getEmergencyContactByUserId({ userId: createUserDto.id });
      expect(response).toStrictEqual(mockResponse);
    });

    it('should fail to get emergency contact by userId', async () => {
      try {
        await service.getEmergencyContactByUserId({ userId: null });
      } catch (e) {
        expect(new InternalServerErrorException()).toStrictEqual(
          new InternalServerErrorException(),
        );
      }
    });
  });
});
