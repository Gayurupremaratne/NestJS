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
import { BadgeService } from './badge.service';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { BadgeIdentifierDto, BadgeStageIdentifierDto } from './dto/badge-identifier.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { PaginatedResult } from '@common/helpers';
import { Badge } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { GetAllBadgeDto } from './dto/all-badge.dto';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('badges')
@ApiTags('Badges')
@UseInterceptors(new ResponseInterceptor())
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createBadge(@Body() createBadgeDto: CreateBadgeDto): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(await this.badgeService.createBadge(createBadgeDto));
  }

  @Get('en')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllBadgesEn(
    @Query() data: GetAllBadgeDto,
  ): Promise<JsonResponse<PaginatedResult<Badge>>> {
    return JsonResponseSerializer(await this.badgeService.getAllBadgesEn(data));
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'This end point is for mobile, retrieve badges that either have no associated stage or are associated with an active stage',
  })
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllBadges(@Query() data: GetAllBadgeDto): Promise<JsonResponse<PaginatedResult<Badge>>> {
    return JsonResponseSerializer(await this.badgeService.getAllBadges(data));
  }

  @Get('/me/latest')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getLoggedUserLatestBadge(@AuthenticatedUser() user): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(await this.badgeService.getLoggedUserLatestBadge(user.sub));
  }

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getBadge(@Param() queryParameters: BadgeIdentifierDto): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(await this.badgeService.getBadge(queryParameters.id));
  }

  @Get('/stage/:stageId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getBadgeByStageId(
    @Param() queryParameters: BadgeStageIdentifierDto,
  ): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(
      await this.badgeService.getBadgeByStageId(queryParameters.stageId),
    );
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateBadge(
    @Param() queryParameters: BadgeIdentifierDto,
    @Body() data: UpdateBadgeDto,
  ): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(await this.badgeService.updateBadge(queryParameters.id, data));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.BADGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteBadge(@Param() queryParameters: BadgeIdentifierDto): Promise<JsonResponse<Badge>> {
    return JsonResponseSerializer(await this.badgeService.deleteBadge(queryParameters.id));
  }
}
