import { Body, Controller, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { OnboardingMetaDto } from './dto/onboarding-meta.dto';
import { OnboardingGuidelineMetaService } from './onboarding-meta-translation.service';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@Controller('onboarding-meta')
@ApiTags('Onboarding Guidelines')
export class OnboardingMetaController {
  constructor(private readonly OnboardingGuidelineService: OnboardingGuidelineMetaService) {}

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.ONBOARDING_GIUDELINES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateOnboardingMetaTranslation(
    @Body() data: OnboardingMetaDto,
  ): Promise<JsonResponse<OnboardingMetaDto>> {
    return JsonResponseSerializer(
      await this.OnboardingGuidelineService.updateOnboardingMetaTranslation(data),
    );
  }
}
