import { PromotionTranslations } from '@prisma/client';

export class PromotionDto {
  id: string;

  url: string;

  assetKeysId: string;

  createdAt: Date;

  updatedAt: Date;

  promotionTranslations: PromotionTranslations[];
}
