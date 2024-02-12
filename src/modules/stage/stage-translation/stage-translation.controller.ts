import { Body, Controller, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateStageTranslationDto } from './dto/update-stage-translation.dto';
import { StageTranslationDto } from './dto/stage-translation.dto';
import { StageTranslationService } from './stage-translation.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stages')
@Controller('stage-translations')
export class StageTranslationController {
  constructor(private stageTranslationService: StageTranslationService) {}

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.STAGE_TRANSLATION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateStageTranslation(
    @Body() data: UpdateStageTranslationDto,
  ): Promise<JsonResponse<StageTranslationDto | null>> {
    return JsonResponseSerializer(await this.stageTranslationService.updateStageTranslation(data));
  }
}
