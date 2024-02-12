import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { PromotionTranslationDto } from './dto/promotion-translation.dto';
import { UpdatePromotionTranslationDto } from './dto/update-promotion-translation.dto';
import { PromotionTranslationRepository } from './promotion-translation.repository';

@Injectable()
export class PromotionTranslationService {
  constructor(private promotionTranslationRepository: PromotionTranslationRepository) {}

  async upsertPromotionTranslation(
    data: UpdatePromotionTranslationDto,
  ): Promise<PromotionTranslationDto> {
    return plainToClass(
      PromotionTranslationDto,
      this.promotionTranslationRepository.upsertPromotionTranslation(data),
    );
  }
}
