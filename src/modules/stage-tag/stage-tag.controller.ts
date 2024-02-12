import { PaginatedResult } from '@common/helpers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
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
import { StageTag } from '@prisma/client';
import { StageTagDto } from './dto/stage-tag.dto';
import { StageTagParamDto } from './dto/stage-tag-params.dto';
import { StageTagService } from './stage-tag.service';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { StageTagQueryParamDto } from './dto/stage-tag-query-params.dto';
import { AuthGuard } from '../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stage tags')
@Controller('stage-tags')
export class StageTagController {
  constructor(private stageTagService: StageTagService) {}

  @Get('en')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getAllTagsEn(
    @Query() queryParams: StageTagQueryParamDto,
  ): Promise<JsonResponse<PaginatedResult<StageTag[]>>> {
    return JsonResponseSerializer(await this.stageTagService.getAllTagsEn(queryParams));
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getAllTags(
    @Query() queryParams: StageTagQueryParamDto,
  ): Promise<JsonResponse<PaginatedResult<StageTag[]>>> {
    return JsonResponseSerializer(
      await this.stageTagService.getAllTags(
        queryParams.pageNumber,
        queryParams.perPage,
        queryParams.stages,
      ),
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getStageTag(@Param() params: StageTagParamDto): Promise<JsonResponse<StageTagDto | null>> {
    return JsonResponseSerializer(await this.stageTagService.getStageTag(params.id));
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities(
    { action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.STAGE_TAG },
    { action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL },
  )
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createStageTag(): Promise<JsonResponse<StageTagDto>> {
    return JsonResponseSerializer(await this.stageTagService.createStageTag());
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.STAGE_TAG })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateStageTag(
    @Param() params: StageTagParamDto,
  ): Promise<JsonResponse<StageTagDto | null>> {
    return JsonResponseSerializer(await this.stageTagService.updateStageTag(params.id));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.STAGE_TAG })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteStageTag(@Param() params: StageTagParamDto): Promise<JsonResponse<string>> {
    return JsonResponseSerializer(await this.stageTagService.deleteStageTag(params.id));
  }
}
