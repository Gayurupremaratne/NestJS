import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { StageMediaService } from './stage-media.service';
import { CreateStageMediaDto } from './dto/create-stage-media.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StageMediaReqParamDto } from './dto/stage-media-req-param.dto';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { JsonResponseSerializer } from '@common/serializers';
import { StageMediaDto } from './dto/stage-media.dto';
import { plainToInstance } from 'class-transformer';
import { StageMediaUpdateReqParamDto } from './dto/stage-media-update-req-params.dto';
import { UpdateStageMediaDto } from './dto/update-stage-media.dto';
import { CreateStageMediaBulkDto } from './dto/create-stage-media-bulk.dto';
import { StageMediaDeleteReqParamDto } from './dto/stage-media-delete-req-params.dto';
import { JsonResponse } from '@common/types';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { $Enums } from '@prisma/client';
import { AuthGuard } from '../../casl/authorization-guard';

@Controller('stage-media')
@ApiTags('Stages Media')
export class StageMediaController {
  constructor(private readonly stageMediaService: StageMediaService) {}

  /**
   *
   * @param reqParams
   * @param createStageMediaDto
   * @param req
   * @returns {Promise<StageMedia>}
   * this will save the trail media uploaded from the mobile app
   * only can save one media per request
   */
  @Post('mobile/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async create(
    @Param() reqParams: StageMediaReqParamDto,
    @Body() createStageMediaDto: CreateStageMediaDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<StageMediaDto>> {
    const response = await this.stageMediaService.create({
      ...createStageMediaDto,
      stageId: reqParams.stageId,
      userId: user.sub,
      mediaType: $Enums.STAGE_MEDIA_KEY_TYPES.HIKER_IMAGE,
    });
    return JsonResponseSerializer(response);
  }

  /**
   *
   * @param reqParams
   * @param createStageMediaDto
   * @param req
   * @returns {Promise<StageMedia[]>}
   * this will save the trail media uploaded from the web app
   * can save multiple media per request
   */
  @Post('web/:stageId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createWebBulk(
    @Param() reqParams: StageMediaReqParamDto,
    @Body() createStageMediaDto: CreateStageMediaBulkDto,
    @AuthenticatedUser() user,
  ) {
    const redefinedData: any = await Promise.all(
      createStageMediaDto.mediaKeys.map((item: CreateStageMediaDto) => {
        return { ...item, stageId: reqParams.stageId, userId: user.sub };
      }),
    );

    const response = await this.stageMediaService.createBulk(redefinedData);
    return JsonResponseSerializer(response);
  }

  /**
   *
   * @param reqParams
   * @returns {Promise<StageMedia[]>}
   * this will get all the trail media by stage id
   * can get multiple media per request
   */
  @Get(':stageId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async findallByStageId(
    @Param() reqParams: StageMediaReqParamDto,
    @Query('isAdmin') isAdmin: string,
    @Query('perPage') perPage: number,
    @Query('pageNumber') pageNumber: number,
  ): Promise<JsonResponse<StageMediaDto>> {
    const response = plainToInstance(
      StageMediaDto,
      await this.stageMediaService.findAllByStageId(
        reqParams.stageId,
        isAdmin,
        perPage,
        pageNumber,
      ),
    );
    return JsonResponseSerializer(response);
  }

  /**
   *
   * @param id
   * @param updateStageMediaDto
   * @returns {Promise<StageMedia>}
   */
  @Put(':stageId/:mediaId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async update(
    @Param() reqParams: StageMediaUpdateReqParamDto,
    @Body() updateStageMediaDto: UpdateStageMediaDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<StageMediaDto>> {
    const response: StageMediaDto = plainToInstance(
      StageMediaDto,
      await this.stageMediaService.update(reqParams, {
        ...updateStageMediaDto,
        userId: user.sub,
      }),
    );
    return JsonResponseSerializer(response);
  }

  @Delete(':mediaId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async remove(
    @Param() reqParams: StageMediaDeleteReqParamDto,
  ): Promise<JsonResponse<StageMediaDto>> {
    const response = plainToInstance(
      StageMediaDto,
      await this.stageMediaService.remove(reqParams.mediaId),
    );
    return JsonResponseSerializer(response);
  }

  @Get('me/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getMyStageMedia(
    @Param() reqParams: StageMediaReqParamDto,
    @Query('perPage') perPage: number,
    @Query('pageNumber') pageNumber: number,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<StageMediaDto>> {
    const response = plainToInstance(
      StageMediaDto,
      await this.stageMediaService.getMyStageMedia(
        reqParams.stageId,
        user.sub,
        perPage,
        pageNumber,
      ),
    );
    return JsonResponseSerializer(response);
  }
}
