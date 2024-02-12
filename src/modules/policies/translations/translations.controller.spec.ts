import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from '../policies.service';
import { TranslationsController } from './translations.controller';

import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from 'nest-keycloak-connect';
import { MockAbilitiesGuard } from '../../../common/mock-modules/abilities.guard.mock';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { TranslationsService } from './translations.service';

describe('TranslationsController', () => {
  let app: INestApplication;
  let translationsController: TranslationsController;
  let policiesService: PoliciesService;
  let policiesTranslationsService: TranslationsService;
  let prismaService: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;

  let policyId: string;

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
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
      controllers: [TranslationsController],
      providers: [
        TranslationsService,
        PoliciesService,
        PrismaService,
        UserService,
        UserRepository,
        StaticContentService,
        StaticContentRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    translationsController = module.get<TranslationsController>(TranslationsController);
    policiesService = module.get<PoliciesService>(PoliciesService);
    policiesTranslationsService = module.get<TranslationsService>(TranslationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    const result = await policiesService.create({
      order: await policiesService.nextOrder(),
      acceptanceRequired: true,
      icon: 'abcd.jpg',
      isGroupParent: true,
    });

    policyId = result.id;
  });

  it('should be defined', () => {
    expect(translationsController).toBeDefined();
    expect(policiesService).toBeDefined();
    expect(policiesTranslationsService).toBeDefined();
    expect(prismaService).toBeDefined();
    expect(app).toBeDefined();
  });

  it('should create policy translation', async () => {
    const response = await translationsController.upsert(
      {
        localeId: 'en',
        policyId: policyId,
      },
      {
        title: 'test',
        description: faker.lorem.lines(1),
        content: faker.lorem.sentences(2),
      },
    );

    expect(response.data).toBeDefined();
  });

  afterAll(async () => {
    await prismaService.policy.delete({
      where: {
        id: policyId,
      },
    });
    await app.close();
    await prismaService.$disconnect();
  });
});
