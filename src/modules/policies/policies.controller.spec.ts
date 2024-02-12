import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { faker } from '@faker-js/faker';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from 'nest-keycloak-connect';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { PolicyIdentifierDto } from './dto/policy-identifier.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';

describe('PoliciesController', () => {
  let app: INestApplication;
  let policiesController: PoliciesController;
  let policiesService: PoliciesService;
  let globalOrder: number;
  const globalSlug: string = `${faker.color.human()}-${uuidv4()}`;

  const createdIds: string[] = [];

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
      controllers: [PoliciesController],
      providers: [
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

    policiesController = module.get<PoliciesController>(PoliciesController);
    policiesService = module.get<PoliciesService>(PoliciesService);

    globalOrder = await policiesService.nextOrder();
  });

  it('should be defined', () => {
    expect(policiesController).toBeDefined();
    expect(policiesService).toBeDefined();
    expect(app).toBeDefined();
    expect(globalOrder).toBeDefined();
    expect(globalSlug).toBeDefined();
  });

  it('should create a new policy', async () => {
    const data = {
      acceptanceRequired: false,
      icon: 'abcd.jpg',
      isGroupParent: true,
      slug: globalSlug,
      order: 1,
    };

    const response = await policiesController.create(data);

    const { acceptanceRequired, icon, isGroupParent, id, slug, order } = response.data;

    expect(data).toStrictEqual({
      acceptanceRequired,
      icon,
      isGroupParent,
      slug,
      order,
    });

    expect(id).toBeDefined();

    createdIds.push(id);
  });

  it('should force acceptance false on group parent', async () => {
    const data = {
      order: globalOrder + 10,
      acceptanceRequired: true,
      icon: 'abcd.jpg',
      isGroupParent: true,
    };

    const response = await policiesController.create(data);

    const { acceptanceRequired, id } = response.data;

    expect(acceptanceRequired).toEqual(false);
    expect(id).toBeDefined();

    createdIds.push(id);
  });

  it('should ignore icon if child policy', async () => {
    const data = {
      order: 0,
      acceptanceRequired: true,
      icon: 'abcd.jpg',
      isGroupParent: false,
      parentPolicyId: createdIds[0],
    };

    const response = await policiesController.create(data);

    const { icon, id } = response.data;

    expect(icon).toBeNull();
    expect(id).toBeDefined();
  });

  it('should find all', async () => {
    const response = await request(app.getHttpServer()).get('/policies');

    const foundRecord = response.body.data.find((policy) => policy.id === createdIds[0]);

    expect(foundRecord).toBeDefined();
  });

  it('should find by id', async () => {
    const response = await request(app.getHttpServer()).get(`/policies/${createdIds[0]}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });

  it('should find by slug', async () => {
    const response = await request(app.getHttpServer()).get(`/policies/${globalSlug}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });

  it('should update by id', async () => {
    const param: PolicyIdentifierDto = {
      id: createdIds[0],
    };

    const data: UpdatePolicyDto = {
      id: createdIds[0],
      acceptanceRequired: true,
      slug: globalSlug,
      order: 2,
    };

    const response = await policiesController.update(param, data);

    const { acceptanceRequired, slug, order } = response.data;

    expect(data.slug).toBe(slug);
    expect(data.order).toBe(order);
    // Should not change
    expect(acceptanceRequired).toBe(false);
  });

  it('should allow deleting', async () => {
    const request: PolicyIdentifierDto = {
      id: createdIds[0],
    };
    await policiesController.remove(request);

    expect(
      (async () => {
        await policiesService.findOne(createdIds[0]);
      })(),
    ).rejects.toThrow(NotFoundException);
  });

  afterAll(async () => {
    await policiesService.remove(createdIds[1]);
    await app.close();
  });
});
