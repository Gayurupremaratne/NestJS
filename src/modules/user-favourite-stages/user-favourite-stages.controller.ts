import { Controller, Post, Param, Delete, Req, UseGuards, Get, Query } from '@nestjs/common';
import { UserFavouriteStagesService } from './user-favourite-stages.service';
import { UserFavouriteStageDto } from './dto/user-favourite-stage.dto';
import { CustomAuthRequest } from '@common/types';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserFavouriteStagePaginationDto } from './dto/user-favourite-stage-pagination.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { AuthGuard } from '../casl/authorization-guard';

@Controller()
@ApiTags('Stage Favourites')
export class UserFavouriteStagesController {
  constructor(private readonly userFavouriteStagesService: UserFavouriteStagesService) {}

  @Get('user-favourites')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getFavoriteStagesOfLoggedUser(
    @Query() query: UserFavouriteStagePaginationDto,
    @Req() request: CustomAuthRequest,
  ) {
    return JsonResponseSerializer(
      await this.userFavouriteStagesService.getFavoriteStagesOfLoggedUser(
        query.perPage,
        query.pageNumber,
        request.user.sub,
      ),
    );
  }

  @Post('stages/:stageId/favourite')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createFavouriteStage(
    @Req() request: CustomAuthRequest,
    @Param() userFavouriteStageDto: UserFavouriteStageDto,
  ) {
    return this.userFavouriteStagesService.createFavouriteStage(
      userFavouriteStageDto,
      request.user.sub,
    );
  }

  @Delete('stages/:stageId/favourite')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteFavouriteStage(
    @Req() request: CustomAuthRequest,
    @Param() userFavouriteStageDto: UserFavouriteStageDto,
  ) {
    return this.userFavouriteStagesService.deleteFavouriteStage(
      userFavouriteStageDto,
      request.user.sub,
    );
  }
}
