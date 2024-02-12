import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from 'nest-keycloak-connect';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { CreateAssetDto } from '../../static-content/dto/create-asset.dto';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { PromotionDto } from '../dto/promotion.dto';
import { PromotionTranslationRepository } from '../promotion-translation/promotion-translation.repository';
import { PromotionTranslationService } from '../promotion-translation/promotion-translation.service';
import { PromotionController } from '../promotion.controller';
import { PromotionRepository } from '../promotion.repository';
import { PromotionService } from '../promotion.service';

describe('Promotion Controller', () => {
  let app: INestApplication;
  let promotionController: PromotionController;
  let createdPromotion: PromotionDto;
  let prisma: PrismaService;
  let createdAssetKey: CreateAssetDto;

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
      controllers: [PromotionController],
      providers: [
        PromotionService,
        PrismaService,
        PromotionRepository,
        PromotionTranslationService,
        PromotionTranslationRepository,
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

    promotionController = module.get<PromotionController>(PromotionController);
    prisma = module.get(PrismaService);

    //Create asset key record before promotion execution
    const fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: 'test' },
    });
  });

  it('should be defined', () => {
    expect(promotionController).toBeDefined();
  });

  describe('Create promotion', () => {
    it('should create a promotion', async () => {
      const promotionRequest = {
        url: 'http://test.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: true,
      };

      const response = await promotionController.createPromotion(promotionRequest);

      const expected = {
        id: expect.any(String),
        url: 'http://test.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: true,
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      };
      createdPromotion = Object.assign({}, response.data);
      expect(response.data).toEqual(expected);
    });
  });

  describe('Get all promotions', () => {
    it('should return promotion', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should return promotion en', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions/en`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should return promotion en sort by title in asc', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions/en?sortBy=title`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should return active promotions', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions?status=Active`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      response.body.data.data.forEach((promotion) => {
        expect(promotion.isActive).toBe(true);
      });
    });

    it('should return inactive promotions', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions?status=Inactive`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      response.body.data.data.forEach((promotion) => {
        expect(promotion.isActive).toBe(false);
      });
    });

    it('should return active promotions', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions/en?status=Active`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      response.body.data.data.forEach((promotion) => {
        expect(promotion.isActive).toBe(true);
      });
    });

    it('should return inactive promotions', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions/en?status=Inactive`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      response.body.data.data.forEach((promotion) => {
        expect(promotion.isActive).toBe(false);
      });
    });
  });

  describe('Get promotion', () => {
    it('should get promotion', async () => {
      const response = await request(app.getHttpServer()).get(`/promotions/${createdPromotion.id}`);

      const expected = {
        url: 'http://test.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: true,
        promotionTranslations: [],
      };

      const transformed = response.body.data as PromotionDto;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      delete transformed.id;

      expect(response.status).toBe(200);
      expect(transformed).toStrictEqual(expected);
    });
  });

  describe('Update promotion', () => {
    it('should update a promotion', async () => {
      const updatePromotionRequest = {
        url: 'http://test.com/update',
        mediaKey: createdAssetKey.fileKey,
        isActive: false,
      };

      const response = await promotionController.updatePromotion(
        { id: createdPromotion.id },
        updatePromotionRequest,
      );

      const promotionResponseData = response.data as PromotionDto;
      delete promotionResponseData.createdAt;
      delete promotionResponseData.updatedAt;
      delete promotionResponseData.id;

      expect(promotionResponseData).toEqual(updatePromotionRequest);
    });
  });

  describe('Delete promotion', () => {
    it('should delete promotion', async () => {
      const response = await promotionController.deletePromotion({ id: createdPromotion.id });
      expect(response.data).toStrictEqual(createdPromotion.id);
    });
  });

  afterAll(async () => {
    await prisma.assetKeys.delete({ where: { id: createdAssetKey.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
