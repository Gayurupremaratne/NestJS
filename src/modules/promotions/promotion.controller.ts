import { PaginatedResult } from '@common/helpers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Promotions } from '@prisma/client';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetAllPromotionDto } from './dto/get-all-promotion.dto';
import { PromotionParamDto } from './dto/promotion-param.dto';
import { PromotionDto } from './dto/promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionService } from './promotion.service';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AuthGuard } from '../casl/authorization-guard';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { checkAbilities } from '@common/decorators/abilities.decorator';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Get()
  @ApiBearerAuth()
  async getAllPromotions(
    @Query() params: GetAllPromotionDto,
  ): Promise<JsonResponse<PaginatedResult<Promotions[]>>> {
    return JsonResponseSerializer(await this.promotionService.getAllPromotions(params));
  }

  @Get('en')
  @ApiBearerAuth()
  async getAllPromotionsEn(
    @Query() params: GetAllPromotionDto,
  ): Promise<JsonResponse<PaginatedResult<Promotions[]>>> {
    return JsonResponseSerializer(await this.promotionService.getAllPromotionsEn(params));
  }

  @Get(':id')
  @ApiBearerAuth()
  async getPromotion(
    @Param() params: PromotionParamDto,
  ): Promise<JsonResponse<PromotionDto | null>> {
    return JsonResponseSerializer(await this.promotionService.getPromotion(params.id));
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.PROMOTIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createPromotion(@Body() data: CreatePromotionDto): Promise<JsonResponse<PromotionDto>> {
    return JsonResponseSerializer(await this.promotionService.createPromotion(data));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.PROMOTIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updatePromotion(
    @Param() params: PromotionParamDto,
    @Body() data: UpdatePromotionDto,
  ): Promise<JsonResponse<PromotionDto | null>> {
    return JsonResponseSerializer(await this.promotionService.updatePromotion(params.id, data));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.PROMOTIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deletePromotion(@Param() params: PromotionParamDto): Promise<JsonResponse<string>> {
    return JsonResponseSerializer(await this.promotionService.deletePromotion(params.id));
  }
}
