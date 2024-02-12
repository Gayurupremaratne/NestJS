import { Test } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssetDto } from '../../static-content/dto/create-asset.dto';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { PromotionDto } from '../dto/promotion.dto';
import { PromotionTranslationRepository } from '../promotion-translation/promotion-translation.repository';
import { PromotionTranslationService } from '../promotion-translation/promotion-translation.service';
import { PromotionRepository } from '../promotion.repository';
import { PromotionService } from '../promotion.service';

describe('PromotionService', () => {
  let prisma: PrismaService;
  let promotionService: PromotionService;
  let createdPromotion: PromotionDto;
  let createdAssetKey: CreateAssetDto;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionService,
        PrismaService,
        PromotionRepository,
        PromotionTranslationService,
        PromotionTranslationRepository,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    promotionService = moduleRef.get(PromotionService);

    //Create asset key record before promotion execution
    const fileKey = uuidv4();
    createdAssetKey = await prisma.assetKeys.create({
      data: { fileKey, module: 'test' },
    });
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Create promotion', () => {
    it('should create promotion', async () => {
      const promotionCreate: CreatePromotionDto = {
        url: 'http://test.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: true,
      };

      const response = await promotionService.createPromotion(promotionCreate);
      createdPromotion = Object.assign({}, response);

      delete response.id;
      delete response.createdAt;
      delete response.updatedAt;
      expect(response).toEqual(promotionCreate);
    });
  });

  describe('Get promotion', () => {
    it('should get promotion', async () => {
      const expectedPromotion = {
        url: 'http://test.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: true,
      };

      const retrievedPromotion = await promotionService.getPromotion(createdPromotion.id);
      const transformedPromotion = retrievedPromotion;
      delete transformedPromotion.id;
      delete transformedPromotion.createdAt;
      delete transformedPromotion.promotionTranslations;
      delete transformedPromotion.updatedAt;
      expect(transformedPromotion).toEqual(expectedPromotion);
    });
  });

  describe('Update promotion', () => {
    it('should update promotion', async () => {
      const updatePromotionRequest = {
        url: 'http://updated.com',
        mediaKey: createdAssetKey.fileKey,
        isActive: false,
      };

      const updatedPromotion = await promotionService.updatePromotion(
        createdPromotion.id,
        updatePromotionRequest,
      );
      delete updatedPromotion.id;
      delete updatedPromotion.createdAt;
      delete updatedPromotion.updatedAt;
      expect(updatedPromotion).toEqual(updatePromotionRequest);
    });
  });

  describe('Delete promotion', () => {
    it('should delete promotion', async () => {
      const retrievedPromotion = await promotionService.deletePromotion(createdPromotion.id);
      expect(retrievedPromotion).toEqual(createdPromotion.id);
    });
  });

  afterAll(async () => {
    await prisma.assetKeys.delete({ where: { id: createdAssetKey.id } });
    await prisma.$disconnect();
  });
});
