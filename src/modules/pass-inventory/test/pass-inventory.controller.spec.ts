import { QUEUES, STAGE_DIFFICULTY_TYPES, STAGE_DIFFICULTY_TYPE_CODE } from '@common/constants';
import {
  FAMILY_FRIENDLY_STATUS,
  FAMILY_FRIENDLY_STATUS_CODE,
} from '@common/constants/family_friendly_status.constant';
import {
  PEOPLE_INTERACTIONS,
  PEOPLE_INTERACTIONS_CODE,
} from '@common/constants/people_interaction.constant';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { PassesService } from '../../passes/passes.service';
import { StageDto } from '../../stage/dto/stage.dto';
import { StageTranslationController } from '../../stage/stage-translation/stage-translation.controller';
import { StageTranslationRepository } from '../../stage/stage-translation/stage-translation.repository';
import { StageTranslationService } from '../../stage/stage-translation/stage-translation.service';
import { StageController } from '../../stage/stage.controller';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { PassInventoryDto } from '../dto/pass-inventory.dto';
import { PassInventoryController } from '../pass-inventory.controller';
import { PassInventoryService } from '../pass-inventory.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('PassInventoryController', () => {
  let app: INestApplication;
  let stageController: StageController;
  let passInventoryController: PassInventoryController;
  let mockAbilitiesGuard: AbilitiesGuard;
  let createdStage: StageDto;
  let createdPassInventory: PassInventoryDto;
  let prisma: PrismaService;
  let mockAuthGuard: AuthGuard;

  const stageRequest = {
    distance: 1,
    estimatedDuration: {
      hours: 1,
      minutes: 10,
    },
    openTime: '08:00:00',
    closeTime: '17:00:00',
    elevationGain: 100,
    open: false,
    number: 1,
    cumulativeReviews: 0,
    reviewsCount: 0,
    difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
    peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
    familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
    kmlFileKey: '',
    startPoint: [],
    endPoint: [],
  };

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
      controllers: [StageController, StageTranslationController, PassInventoryController],
      providers: [
        StageService,
        PassInventoryService,
        PrismaService,
        StageRepository,
        StageTranslationService,
        StageTranslationRepository,
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        StaticContentService,
        StaticContentRepository,
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

    stageController = module.get<StageController>(StageController);
    passInventoryController = module.get<PassInventoryController>(PassInventoryController);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    prisma = module.get(PrismaService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    mockAuthGuard = module.get<AuthGuard>(AuthGuard);
    jest.spyOn(mockAuthGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(stageController).toBeDefined();
    expect(passInventoryController).toBeDefined();
  });

  describe('Create pass inventory', () => {
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/stages').send(stageRequest);

      createdStage = Object.assign({}, response.body.data);
      const expected = {
        distance: 1,
        estimatedDuration: {
          hours: 1,
          minutes: 10,
        },
        openTime: createdStage.openTime,
        closeTime: createdStage.closeTime,
        elevationGain: 100,
        open: false,
        number: 1,
        cumulativeReviews: 0,
        reviewsCount: 0,
        difficultyType: STAGE_DIFFICULTY_TYPES[STAGE_DIFFICULTY_TYPE_CODE.BEGINNER],
        peopleInteraction: PEOPLE_INTERACTIONS[PEOPLE_INTERACTIONS_CODE.LOW],
        familyFriendly: FAMILY_FRIENDLY_STATUS[FAMILY_FRIENDLY_STATUS_CODE.YES],
        kmlFileKey: '',
        startPoint: [],
        endPoint: [],
      };

      const transformed = response.body.data as StageDto;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      delete transformed.maximumAltitude;
      expect(response.status).toBe(201);
      expect(transformed).toStrictEqual(expected);
    });

    // get the id from the created stage and add it to the passInventoryRequest
    it('should create a pass inventory', async () => {
      const passInventoryRequest = {
        stageId: createdStage.id,
        quantity: 100,
        date: new Date('2023-07-21'),
      };

      const response = await request(app.getHttpServer())
        .post('/pass-inventory')
        .send(passInventoryRequest);

      const expected = {
        stageId: createdStage.id,
        quantity: 100,
        date: '2023-07-21T00:00:00.000Z',
      };

      createdPassInventory = Object.assign({}, response.body.data);

      const transformed = response.body.data as PassInventoryDto;

      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      expect(response.status).toBe(201);
      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Get pass inventories by month', () => {
    it('should return pass inventory', async () => {
      const response = await request(app.getHttpServer()).get(
        `/pass-inventory/stage/${createdStage.id}/inventory/07/2023`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Get pass inventories allocation by month', () => {
    it('should return pass inventory', async () => {
      const response = await request(app.getHttpServer()).get(
        `/pass-inventory/stage/${createdStage.id}/inventory-allocation/07/2023`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Get pass inventory reservation for the reserved date', () => {
    it('should return pass inventory reservation data', async () => {
      const response = await request(app.getHttpServer()).get(
        `/pass-inventory/stage/${createdStage.id}/inventory/pass-reservations?startDate=2023-07-21&endDate=2023-07-21`,
      );
      expect(response.status).toBe(200);
    });
  });

  describe('Get pass inventory', () => {
    it('should get pass inventory', async () => {
      const response = await request(app.getHttpServer()).get(
        `/pass-inventory/${createdPassInventory.id}`,
      );

      const expected = {
        stageId: createdStage.id,
        quantity: 100,
        date: '2023-07-21T00:00:00.000Z',
      };

      const transformed = response.body.data as PassInventoryDto;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;
      expect(response.status).toBe(200);
      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Update pass inventory', () => {
    it('should update pass inventory quantity', async () => {
      const response = await request(app.getHttpServer())
        .put(`/pass-inventory/batch-update/${createdStage.id}`)
        .send({
          quantity: 50,
          startDate: new Date('2023-07-21T00:00:00.000Z'),
          endDate: new Date('2023-07-21T00:00:00.000Z'),
          stageClosure: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    await prisma.stage.delete({ where: { id: createdStage.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
