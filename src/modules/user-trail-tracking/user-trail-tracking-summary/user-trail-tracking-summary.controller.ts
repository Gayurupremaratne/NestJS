import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserTrailTrackingSummaryService } from './user-trail-tracking-summary.service';
import { GetUserTrailTrackingSummaryParamDto } from './dto/get-user-trail-summary-params.dto';
import { GetUserTrailTrackingSummaryByStageQueryDto } from './dto/get-user-trail-summary-by-stage-query.dto';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { GetUserTrailTrackingSummaryPassIdParamDto } from './dto/get-user-trail-summary-by-passId-params.dto';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { GetAllUsersTrailSummaryParamsDto } from './dto/get-all-users-trail-summary-params.dto';
import { AuthGuard } from '../../casl/authorization-guard';

@ApiTags('User Trail Tracking Summary')
@UseInterceptors(new ResponseInterceptor())
@Controller('user-trail-tracking-summary')
export class UserTrailTrackingSummaryController {
  constructor(private readonly userTrailTrackingSummaryService: UserTrailTrackingSummaryService) {}

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL_TRACKING })
  @UseGuards(AbilitiesGuard)
  async getAllUsersTrailTrackingSummary(@Query() query: GetAllUsersTrailSummaryParamsDto) {
    return JsonResponseSerializer(
      await this.userTrailTrackingSummaryService.getAllUsersTrailCompletionSummary(query),
    );
  }
  @Get('/user')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getUserTrailSummaryByUser(@AuthenticatedUser() user) {
    return JsonResponseSerializer(
      await this.userTrailTrackingSummaryService.getUserTrailTrackingSummary(user.sub),
    );
  }

  @Get('/user/:userId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL_TRACKING })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUserTrailSummary(@Param() params: GetUserTrailTrackingSummaryParamDto) {
    return JsonResponseSerializer(
      await this.userTrailTrackingSummaryService.getUserTrailTrackingSummary(params.userId),
    );
  }

  @Get('/user/:userId/stages')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL_TRACKING })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUserTrailTrackingByStage(
    @Param() params: GetUserTrailTrackingSummaryParamDto,
    @Query() query: GetUserTrailTrackingSummaryByStageQueryDto,
  ) {
    return JsonResponseSerializer(
      await this.userTrailTrackingSummaryService.getUserTrailTrackingOfAllStages(
        params.userId,
        query.pageNumber,
        query.perPage,
        query.type,
      ),
    );
  }

  @Get('/passes/:passesId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getUserTrailTrackingByPassId(
    @Param() params: GetUserTrailTrackingSummaryPassIdParamDto,
    @AuthenticatedUser() user,
  ) {
    return JsonResponseSerializer(
      await this.userTrailTrackingSummaryService.getUserTrailTrackingByPassId(
        params.passesId,
        user.sub,
      ),
    );
  }
}
