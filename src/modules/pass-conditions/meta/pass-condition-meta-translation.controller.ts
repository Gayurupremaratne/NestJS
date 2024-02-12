import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { Body, Controller, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { PassConditionMetaDto } from './dto/pass-condition-meta.dto';
import { PassConditionMetaService } from './pass-condition-meta-translation.service';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@Controller('pass-condition-meta')
@ApiTags('Pass Conditions')
export class PassConditionMetaController {
  constructor(private readonly PassConditionGuidelineService: PassConditionMetaService) {}

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.PASS_CONDITION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updatePassConditionMetaTranslation(
    @Body() data: PassConditionMetaDto,
  ): Promise<JsonResponse<PassConditionMetaDto>> {
    return JsonResponseSerializer(
      await this.PassConditionGuidelineService.updatePassConditionMetaTranslation(data),
    );
  }
}
