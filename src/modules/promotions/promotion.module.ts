import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserModule } from '@user/user.module';
import { PromotionTranslationController } from './promotion-translation/promotion-translation.controller';
import { PromotionTranslationRepository } from './promotion-translation/promotion-translation.repository';
import { PromotionTranslationService } from './promotion-translation/promotion-translation.service';
import { PromotionController } from './promotion.controller';
import { PromotionRepository } from './promotion.repository';
import { PromotionService } from './promotion.service';

@Module({
  imports: [UserModule],
  controllers: [PromotionController, PromotionTranslationController],
  providers: [
    PromotionService,
    PrismaService,
    PromotionRepository,
    PromotionTranslationService,
    PromotionTranslationRepository,
  ],
})
export class PromotionModule {}
