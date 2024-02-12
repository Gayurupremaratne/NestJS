import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PromotionTranslations } from '@prisma/client';
import { UpdatePromotionTranslationDto } from './dto/update-promotion-translation.dto';

@Injectable()
export class PromotionTranslationRepository {
  constructor(private prisma: PrismaService) {}

  async upsertPromotionTranslation(
    data: UpdatePromotionTranslationDto,
  ): Promise<PromotionTranslations> {
    try {
      return await this.prisma.promotionTranslations.upsert({
        where: {
          localeId_promotionId: { localeId: data.localeId, promotionId: data.promotionId },
        },
        create: data,
        update: data,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update promotion translation');
    }
  }
}
