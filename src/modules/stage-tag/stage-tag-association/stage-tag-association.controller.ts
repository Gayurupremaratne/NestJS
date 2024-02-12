import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StageTagAssociationParamDto } from './dto/stage-tag-association-params.dto';
import { StageTagAssociationDto } from './dto/stage-tag-association.dto';
import { UpdateStageTagAssociationDto } from './dto/update-stage-tag-association.dto';
import { StageTagAssociationService } from './stage-tag-association.service';
import { PaginatedResult } from '@common/helpers';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { Prisma } from '@prisma/client';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stage tags')
@Controller('stage-tags/:stageTagId/stage-tag-association')
export class StageTagAssociationController {
  constructor(private stageTagService: StageTagAssociationService) {}

  @Get()
  @ApiBearerAuth()
  async getStageTagAssociation(
    @Param() params: StageTagAssociationParamDto,
    @Query('perPage') perPage: number,
    @Query('pageNumber') pageNumber: number,
  ): Promise<JsonResponse<PaginatedResult<StageTagAssociationDto[]>>> {
    return JsonResponseSerializer(
      await this.stageTagService.getStageTagAssociation(params.stageTagId, perPage, pageNumber),
    );
  }

  @Put()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.STAGE_TAG })
  @UseGuards(AbilitiesGuard)
  async updateStageTagAssociation(
    @Param() params: StageTagAssociationParamDto,
    @Body() data: UpdateStageTagAssociationDto,
  ): Promise<JsonResponse<[Prisma.BatchPayload, Prisma.BatchPayload]>> {
    return JsonResponseSerializer(
      await this.stageTagService.updateStageTagAssociation(params.stageTagId, data),
    );
  }
}
