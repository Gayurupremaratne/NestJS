import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  ParseArrayPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnboardingGuidelineTranslation } from '@prisma/client';
import { Public } from 'nest-keycloak-connect';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { GuidelineTranslationParamDto } from './dto/onboarding-guideline-param.dto';
import { OnboardingGuidelineResponse } from './dto/onboarding-guideline-response.dto';
import { OnboardingGuidelineTranslationResponse as GuidelineTranslationResponse } from './dto/onboarding-guideline.dto';
import { UpsertGuidelineTranslationDto as CreateGuidelineTranslationDto } from './dto/upsert-guideline-translation.dto';
import { OnboardingGuidelineService } from './onboarding-guideline.service';
import { AuthGuard } from '../../casl/authorization-guard';
@UseInterceptors(new ResponseInterceptor())
@Controller('onboarding-guidelines')
@ApiTags('Onboarding Guidelines')
export class OnboardingGuidelineController {
  constructor(private readonly onboardingGuidelineService: OnboardingGuidelineService) {}

  @Get()
  @Public()
  async getAllGuidelineTranslations(): Promise<JsonResponse<OnboardingGuidelineResponse>> {
    return JsonResponseSerializer(
      await this.onboardingGuidelineService.getAllGuidelineTranslations(),
    );
  }

  @Post()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.ONBOARDING_GIUDELINES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async upsertGuidelineTranslation(
    @Body(new ParseArrayPipe({ items: CreateGuidelineTranslationDto }))
    data: CreateGuidelineTranslationDto[],
  ): Promise<JsonResponse<OnboardingGuidelineTranslation[]>> {
    return JsonResponseSerializer(
      await this.onboardingGuidelineService.upsertGuidelineTranslation(data),
    );
  }

  @Delete()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.ONBOARDING_GIUDELINES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async removeGuidelineTranslation(
    @Query() params: GuidelineTranslationParamDto,
  ): Promise<JsonResponse<GuidelineTranslationResponse>> {
    return JsonResponseSerializer(
      await this.onboardingGuidelineService.removeGuidelineTranslation(params),
    );
  }
}
