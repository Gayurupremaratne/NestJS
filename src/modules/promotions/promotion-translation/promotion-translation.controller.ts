import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { Body, Controller, Put, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PromotionTranslationDto } from './dto/promotion-translation.dto';
import { UpdatePromotionTranslationDto } from './dto/update-promotion-translation.dto';
import { PromotionTranslationService } from './promotion-translation.service';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Promotions')
@Controller('promotion-translations')
export class PromotionTranslationController {
  constructor(private promotionTranslationService: PromotionTranslationService) {}

  @Put()
  @ApiBearerAuth()
  async updatePromotionTranslation(
    @Body() data: UpdatePromotionTranslationDto,
  ): Promise<JsonResponse<PromotionTranslationDto | null>> {
    return JsonResponseSerializer(
      await this.promotionTranslationService.upsertPromotionTranslation(data),
    );
  }
}
