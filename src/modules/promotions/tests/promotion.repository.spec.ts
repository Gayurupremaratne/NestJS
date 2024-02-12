import { Test } from '@nestjs/testing';
import { Promotions } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssetDto } from '../../static-content/dto/create-asset.dto';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { PromotionTranslationRepository } from '../promotion-translation/promotion-translation.repository';
import { PromotionRepository } from '../promotion.repository';
import { PROMOTION_ACTIVE_COUNT } from '@common/constants/promotion.constants';

describe('Promotion Repository', () => {
  let prisma: PrismaService;
  let promotionRepository: PromotionRepository;
  let createdAssetKeyFirst: CreateAssetDto;
  let createdPromotion: Promotions;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, PromotionRepository, PromotionTranslationRepository],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    promotionRepository = moduleRef.get(PromotionRepository);

    //Create asset key record before promotion execution
    const fileKey = uuidv4();
    createdAssetKeyFirst = await prisma.assetKeys.create({
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
        mediaKey: createdAssetKeyFirst.fileKey,
        isActive: true,
      };

      const response = await promotionRepository.createPromotion(promotionCreate);
      createdPromotion = Object.assign({}, response);

      delete response.id;
      delete response.createdAt;
      delete response.updatedAt;
      expect(response).toEqual(promotionCreate);
    });

    it('should throw conflict exception when creating duplicate record', async () => {
      const promotionCreate: CreatePromotionDto = {
        url: 'http://test.com',
        mediaKey: createdAssetKeyFirst.fileKey,
        isActive: true,
      };

      try {
        await promotionRepository.createPromotion(promotionCreate);
      } catch (error) {
        expect(error.response.error).toBe('Conflict');
        expect(error.response.statusCode).toBe(409);
      }
    });
  });

  describe('Update promotion', () => {
    const createdPromotions = [];
    const createdAssetKeys = [];

    beforeAll(async () => {
      // Create six separate asset keys before the test
      for (let i = 0; i < 6; i++) {
        const fileKey = uuidv4();
        const createdAssetKey = await prisma.assetKeys.create({
          data: { fileKey, module: 'test' },
        });
        createdAssetKeys.push(createdAssetKey);
      }
    });

    afterAll(async () => {
      // Clean up: Delete all created promotions and asset keys
      for (const promotion of createdPromotions) {
        await prisma.promotions.delete({ where: { id: promotion.id } });
      }

      for (const assetKey of createdAssetKeys) {
        await prisma.assetKeys.delete({ where: { id: assetKey.id } });
      }

      await prisma.$disconnect();
    });

    it('should update the record', async () => {
      const updatePromotionActiveRequest: UpdatePromotionDto = {
        url: `http://updated.com`,
        mediaKey: createdAssetKeyFirst.fileKey,
        isActive: false,
      };
      await promotionRepository.updatePromotion(createdPromotion.id, updatePromotionActiveRequest);
    });

    it('should throw conflict error', async () => {
      try {
        // Create 6 promotions using the asset keys
        for (let i = 0; i < 6; i++) {
          const promotionCreate: CreatePromotionDto = {
            url: `http://test${i}.com`,
            mediaKey: createdAssetKeys[i].fileKey,
            isActive: false,
          };
          const response = await promotionRepository.createPromotion(promotionCreate);
          createdPromotions.push(response);
        }

        // Update the first 5 promotions to isActive true with new URL and mediaKey
        for (let i = 0; i < 5; i++) {
          const updatePromotionActiveRequest: UpdatePromotionDto = {
            url: `http://updated${i}.com`,
            mediaKey: createdAssetKeys[i].fileKey,
            isActive: true,
          };
          await promotionRepository.updatePromotion(
            createdPromotions[i].id,
            updatePromotionActiveRequest,
          );
        }

        // Attempt to update the 6th promotion to isActive true, which should fail
        const updatePromotionActiveRequest6th: UpdatePromotionDto = {
          url: 'http://updated6.com',
          mediaKey: createdAssetKeys[5].fileKey,
          isActive: true,
        };
        await promotionRepository.updatePromotion(
          createdPromotions[5].id,
          updatePromotionActiveRequest6th,
        );
      } catch (error) {
        expect(error.response.statusCode).toBe(400);
        expect(error.response.message).toBe(
          `You already have ${PROMOTION_ACTIVE_COUNT} active promotions. Please mark 1 as 'Inactive' and proceed with this action.`,
        );
      }
    });
  });

  describe('Get promotion', () => {
    it('get all promotions', async () => {
      const promotions = await promotionRepository.getAllPromotions({});
      expect(promotions).toBeDefined();
    });

    it('get all promotions en', async () => {
      const promotions = await promotionRepository.getAllPromotionsEn({});
      expect(promotions).toBeDefined();
    });

    it('get all promotions en sorted by title', async () => {
      const promotions = await promotionRepository.getAllPromotionsEn({
        sortBy: 'title',
      });
      expect(promotions).toBeDefined();
    });

    it('should throw when retrieving non existing record', async () => {
      try {
        await promotionRepository.getPromotion(uuidv4());
      } catch (error) {
        expect(error.response.message).toBe('Promotion not found');
        expect(error.response.statusCode).toBe(404);
      }
    });

    it('should throw error when getting active promotion eligibility for invalid data', async () => {
      try {
        await promotionRepository.isPromotionEligibleToUpdate(null, null);
      } catch (error) {
        expect(error.response.message).toBe('Failed to get active promotions');
        expect(error.response.statusCode).toBe(500);
      }
    });
  });

  describe('Delete promotion', () => {
    it('should throw error when deleting non existing record', async () => {
      try {
        await promotionRepository.deletePromotion(uuidv4());
      } catch (error) {
        expect(error.response.message).toBe('Failed to delete promotion');
        expect(error.response.statusCode).toBe(500);
      }
    });
  });

  afterAll(async () => {
    await prisma.promotions.delete({ where: { id: createdPromotion.id } });
    await prisma.assetKeys.delete({ where: { id: createdAssetKeyFirst.id } });
    await prisma.$disconnect();
  });
});
