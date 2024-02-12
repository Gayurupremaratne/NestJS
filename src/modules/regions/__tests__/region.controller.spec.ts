import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { RegionController } from '../region.controller';
import { RegionRepository } from '../region.repository';
import { RegionService } from '../region.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('RegionController', () => {
  let app: INestApplication;
  let regionController: RegionController;
  let prisma: PrismaService;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [RegionController],
      providers: [
        PrismaService,
        RegionService,
        RegionRepository,
        StaticContentService,
        StaticContentRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        UserRepository,
        PassesService,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    regionController = module.get<RegionController>(RegionController);
    prisma = module.get(PrismaService);
  });

  describe('Get all regions', () => {
    it('should get all regions', async () => {
      const regionResponse = await regionController.getAllRegions();

      expect(Array.isArray(regionResponse.data)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });
});
