import { PaginatedResult } from '@common/helpers';
import { Injectable } from '@nestjs/common';
import { Promotions } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetAllPromotionDto } from './dto/get-all-promotion.dto';
import { PromotionDto } from './dto/promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionRepository } from './promotion.repository';

@Injectable()
export class PromotionService {
  constructor(private promotionRepository: PromotionRepository) {}

  async getAllPromotions(data: GetAllPromotionDto): Promise<PaginatedResult<Promotions[]>> {
    return await this.promotionRepository.getAllPromotions(data);
  }

  async getAllPromotionsEn(data: GetAllPromotionDto): Promise<PaginatedResult<Promotions[]>> {
    return await this.promotionRepository.getAllPromotionsEn(data);
  }

  async getPromotion(id: string): Promise<PromotionDto | null> {
    return plainToClass(PromotionDto, await this.promotionRepository.getPromotion(id));
  }

  async createPromotion(data: CreatePromotionDto): Promise<PromotionDto> {
    return plainToClass(PromotionDto, await this.promotionRepository.createPromotion(data));
  }

  async updatePromotion(id: string, data: UpdatePromotionDto): Promise<PromotionDto> {
    return plainToClass(PromotionDto, await this.promotionRepository.updatePromotion(id, data));
  }

  async deletePromotion(id: string): Promise<string> {
    return this.promotionRepository.deletePromotion(id);
  }
}
