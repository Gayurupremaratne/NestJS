import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { Controller, Delete, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BadgeService } from './badge.service';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AssignManualBadgesToUser } from './dto/assign-manual-badges.dto';
import { JsonResponse } from '@common/types';
import { UserAwardedBadge } from '@prisma/client';
import { JsonResponseSerializer } from '@common/serializers';
import {
  DeleteUserAssignedBadgeDto,
  UserAwardedBadgesIdentifierDto,
} from './dto/user-awarded-badges-identifier.dto';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('badges')
@ApiTags('Badges')
@UseInterceptors(new ResponseInterceptor())
export class AwardManualBadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post('/:badgeId/users/:userId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.AWARD_BADGE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async assignManualBadgeToUser(
    @Param() queryParameters: AssignManualBadgesToUser,
  ): Promise<JsonResponse<UserAwardedBadge>> {
    return JsonResponseSerializer(
      await this.badgeService.assignManualBadgeToUser(
        queryParameters.userId,
        queryParameters.badgeId,
      ),
    );
  }

  @Get('/users/:userId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUserBadges(
    @Param() queryParameters: UserAwardedBadgesIdentifierDto,
  ): Promise<JsonResponse<UserAwardedBadge[]>> {
    return JsonResponseSerializer(await this.badgeService.getUserBadges(queryParameters.userId));
  }

  @Delete('/users/:id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteUserAssignedBadge(
    @Param() queryParameters: DeleteUserAssignedBadgeDto,
  ): Promise<JsonResponse<UserAwardedBadge>> {
    return JsonResponseSerializer(
      await this.badgeService.deleteUserAssignedBadge(queryParameters.id),
    );
  }
}
