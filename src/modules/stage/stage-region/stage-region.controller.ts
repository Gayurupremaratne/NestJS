import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { Body, Controller, Param, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { CreateStageRegionParamDto } from './dto/create-stage-region-param.dto';
import { CreateStageRegionDto } from './dto/create-stage-region.dto';
import { StageRegionService } from './stage-region.service';
import { Prisma } from '@prisma/client';
import { JsonResponse } from '@common/types';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stages')
@Controller('stages/:stageId/regions')
export class StageRegionController {
  constructor(private stageRegionService: StageRegionService) {}

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createStageRegion(
    @Param() params: CreateStageRegionParamDto,
    @Body() data: CreateStageRegionDto,
  ): Promise<JsonResponse<[Prisma.BatchPayload, Prisma.BatchPayload]>> {
    return JsonResponseSerializer(
      await this.stageRegionService.createStageRegion(params.stageId, data),
    );
  }
}
