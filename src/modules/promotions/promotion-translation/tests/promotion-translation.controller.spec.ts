import { CreateAssetDto } from '../../../static-content/dto/create-asset.dto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Promotions } from '@prisma/client';
import request from 'supertest';
import { PromotionController } from '../../promotion.controller';
import { PromotionRepository } from '../../promotion.repository';
import { PromotionService } from '../../promotion.service';
import { PromotionTranslationDto } from '../dto/promotion-translation.dto';
import { PromotionTranslationController } from '../promotion-translation.controller';
import { PromotionTranslationRepository } from '../promotion-translation.repository';
import { PromotionTranslationService } from '../promotion-translation.service';
import { v4 as uuidv4 } from 'uuid';
import { AbilitiesGuard } from '../../../casl/abilities.guard';
import { KeycloakService } from '../../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../../static-content/static-content.repository';
import { StaticContentService } from '../../../static-content/static-content.service';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import { AuthGuard } from 'nest-keycloak-connect';

describe('Promotion Translation Controller', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdPromotion: Promotions;
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
      controllers: [PromotionController, PromotionTranslationController],
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
    prisma = module.get(PrismaService);
  });

  describe('Update or add promotion translation', () => {
    it('should update or add a promotion translation', async () => {
      //Create asset key record before promotion translation execution
      const fileKey = uuidv4();
      createdAssetKey = await prisma.assetKeys.create({
        data: { fileKey, module: 'test' },
      });

      //create promotion record before promotion translation execution
      const url = 'http://test.com';
      createdPromotion = await prisma.promotions.create({
        data: { url, mediaKey: createdAssetKey.fileKey },
      });

      const promotionRequest = {
        promotionId: createdPromotion.id,
        localeId: 'en',
        ctaText: 'test en',
        title: 'test title',
        description: 'test description',
      };

      const response = await request(app.getHttpServer())
        .put('/promotion-translations')
        .send(promotionRequest);

      const expected = {
        localeId: 'en',
        promotionId: createdPromotion.id,
        title: 'test title',
        description: 'test description',
        ctaText: 'test en',
      };

      const promotionResponse = response.body.data as PromotionTranslationDto;
      delete promotionResponse.createdAt;
      delete promotionResponse.updatedAt;

      expect(promotionResponse).toStrictEqual(expected);
    });
  });

  afterAll(async () => {
    await prisma.promotions.delete({ where: { id: createdPromotion.id } });
    await prisma.assetKeys.delete({ where: { id: createdAssetKey.id } });
    await prisma.$disconnect();
    await app.close();
  });
});
