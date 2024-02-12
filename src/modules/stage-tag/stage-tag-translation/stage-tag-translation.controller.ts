import { Body, Controller, Param, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateStageTagTranslationDto } from './dto/update-stage-tag-translation.dto';
import { StageTagTranslationParamsDto } from './dto/stage-tag-translation-params.dto';
import { StageTagTranslationService } from './stage-tag-translation.service';
import { StageTagTranslationDto } from './dto/stage-tag-translation.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../../casl/abilities.guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stage tags')
@Controller('stage-tags/:stageTagId/translations/:localeId')
export class StageTagTranslationController {
  constructor(private stageTagTranslationService: StageTagTranslationService) {}

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.STAGE_TAG })
  @UseGuards(AbilitiesGuard)
  async updateStageTagTranslation(
    @Param() params: StageTagTranslationParamsDto,
    @Body() data: UpdateStageTagTranslationDto,
  ): Promise<JsonResponse<StageTagTranslationDto | null>> {
    return JsonResponseSerializer(
      await this.stageTagTranslationService.updateStageTagTranslation(
        params.stageTagId,
        params.localeId,
        data,
      ),
    );
  }
}
