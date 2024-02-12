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
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { StageReviewDto } from './dto/stage-review.dto';
import { StageReviewParamDto } from './dto/stage-review-param.dto';
import { StageReviewService } from './stage-review.service';
import { CreateStageReviewDto } from './dto/create-stage-review.dto';
import { UpdateStageReviewDto } from './dto/update-stage-review.dto';
import { PaginatedResult } from '@common/helpers/paginator';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stages')
@Controller('stages/:stageId/stage-reviews')
export class StageReviewController {
  constructor(private stageReviewService: StageReviewService) {}

  @Get()
  @ApiBearerAuth()
  @ApiParam({
    name: 'stageId',
    description: 'ID of the stage for reviews',
    type: String,
    required: true,
  })
  @UseGuards(AuthGuard)
  async getAllStageReviews(
    @Param() params: Pick<StageReviewParamDto, 'stageId'>,
    @Query('perPage') perPage: number,
    @Query('pageNumber') pageNumber: number,
  ): Promise<JsonResponse<PaginatedResult<StageReviewDto[]>>> {
    return JsonResponseSerializer(
      await this.stageReviewService.getAllStageReviews(params.stageId, pageNumber, perPage),
    );
  }

  @Post()
  @ApiBearerAuth()
  @ApiParam({
    name: 'stageId',
    description: 'ID of the stage for reviews',
    type: String,
    required: true,
  })
  @UseGuards(AuthGuard)
  async createStageReview(
    @Param() params: Pick<StageReviewParamDto, 'stageId'>,
    @Body() data: CreateStageReviewDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<StageReviewDto>> {
    return JsonResponseSerializer(
      await this.stageReviewService.createStageReview(params.stageId, data, user.sub),
    );
  }

  @Put('/:stageReviewId')
  @ApiBearerAuth()
  @ApiParam({
    name: 'stageId',
    description: 'ID of the stage for reviews',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'stageReviewId',
    description: 'ID of the stage review',
    type: String,
    required: true,
  })
  @UseGuards(AuthGuard)
  async updateStageReview(
    @Param() params: StageReviewParamDto,
    @Body() data: UpdateStageReviewDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<StageReviewDto>> {
    return JsonResponseSerializer(
      await this.stageReviewService.updateStageReview(
        params.stageId,
        params.stageReviewId,
        data,
        user.sub,
      ),
    );
  }

  @Delete('/:stageReviewId')
  @ApiBearerAuth()
  @ApiParam({
    name: 'stageId',
    description: 'ID of the stage for reviews',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'stageReviewId',
    description: 'ID of the stage review',
    type: String,
    required: true,
  })
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteStageReview(@Param() params: StageReviewParamDto): Promise<JsonResponse<string>> {
    return JsonResponseSerializer(
      await this.stageReviewService.deleteStageReview(params.stageId, params.stageReviewId),
    );
  }
}
