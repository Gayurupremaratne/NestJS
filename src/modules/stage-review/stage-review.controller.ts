import { Controller, Get, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StageReviewDto } from './dto/stage-review.dto';
import { StageReviewParamDto } from './dto/stage-review-param.dto';
import { StageReviewService } from './stage-review.service';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stage Reviews')
@Controller('stage-reviews')
export class StageReviewController {
  constructor(private stageReviewService: StageReviewService) {}

  @Get('/:stageReviewId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getStageReview(
    @Param() params: StageReviewParamDto,
  ): Promise<JsonResponse<StageReviewDto>> {
    return JsonResponseSerializer(
      await this.stageReviewService.getStageReview(params.stageReviewId),
    );
  }
}
