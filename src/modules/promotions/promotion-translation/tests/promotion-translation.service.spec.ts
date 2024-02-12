import { CreateAssetDto } from '@app/modules/static-content/dto/create-asset.dto';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePromotionDto } from '../../dto/create-promotion.dto';
import { PromotionDto } from '../../dto/promotion.dto';
import { PromotionRepository } from '../../promotion.repository';
import { PromotionService } from '../../promotion.service';
import { PromotionTranslationDto } from '../dto/promotion-translation.dto';
import { PromotionTranslationRepository } from '../promotion-translation.repository';
import { PromotionTranslationService } from '../promotion-translation.service';

describe('Promotion Translation Service', () => {
  let prisma: PrismaService;
  let promotionService: PromotionService;
  let promotionTranslationService: PromotionTranslationService;
  let createdPromotion: PromotionDto;
  let createdAssetKey: CreateAssetDto;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        PromotionRepository,
        PromotionTranslationRepository,
        PromotionService,
        PromotionTranslationService,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    promotionService = moduleRef.get(PromotionService);
    promotionTranslationService = moduleRef.get(PromotionTranslationService);

    //Create asset key record before promotion translation execution
    const fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: 'test' },
    });

    //Create promotion record before translation execution
    const promotionRequest: CreatePromotionDto = {
      url: 'http://test.com',
      mediaKey: createdAssetKey.fileKey,
      isActive: true,
    };
    const response = await promotionService.createPromotion(promotionRequest);
    createdPromotion = Object.assign({}, response);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Update or add promotion translation', () => {
    it('should update or add a promotion translation', async () => {
      const promotionTranslationRequest = {
        promotionId: createdPromotion.id,
        localeId: 'en',
        ctaText: 'test en',
        title: 'test title',
        description: 'test description',
      };

      const promotionResponse = await promotionTranslationService.upsertPromotionTranslation(
        promotionTranslationRequest,
      );

      const expected: PromotionTranslationDto = {
        localeId: 'en',
        promotionId: createdPromotion.id,
        title: 'test title',
        description: 'test description',
        ctaText: 'test en',
      };

      delete promotionResponse.createdAt;
      delete promotionResponse.updatedAt;

      expect(promotionResponse).toEqual(expected);
    });
  });

  afterAll(async () => {
    await prisma.promotions.delete({ where: { id: createdPromotion.id } });
    await prisma.assetKeys.delete({ where: { id: createdAssetKey.id } });
    await prisma.$disconnect();
  });
});
