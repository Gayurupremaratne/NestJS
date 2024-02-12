import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StageService } from './stage.service';
import { CustomAuthRequest, JsonResponse } from '@common/types';
import { StageDto } from './dto/stage.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StageParamDto } from './dto/stage-param.dto';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { GetStageDto } from './dto/get-stage-dto';
import { PaginatedResult } from '@common/helpers';
import { GetActivatedUsersByStageDto } from './dto/get-activated-user-dto';
import { ActivatedUserInStageDto } from './dto/get-activated-users-by-stage.dto';
import { AuthGuard } from '../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Stages')
@Controller('stages')
export class StageController {
  constructor(private stageService: StageService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getAllStages(
    @Req() request: CustomAuthRequest,
    @Query() getStageDto?: GetStageDto,
  ): Promise<JsonResponse<PaginatedResult<StageDto>>> {
    return JsonResponseSerializer(
      await this.stageService.getAllStages(request.user.sub, getStageDto),
    );
  }

  @Get('popular')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getTopPopularStages(@Req() request: CustomAuthRequest): Promise<JsonResponse<StageDto[]>> {
    return JsonResponseSerializer(await this.stageService.getTopPopularStages(request.user.sub));
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getStage(
    @Param() params: StageParamDto,
    @Req() request: CustomAuthRequest,
  ): Promise<JsonResponse<StageDto | null>> {
    return JsonResponseSerializer(await this.stageService.getStage(params.id, request.user.sub));
  }

  @Get(':id/users')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getActivatedUsersByStage(
    @Param() params: StageParamDto,
    @Query() getActivatedUsersByStageDto: GetActivatedUsersByStageDto,
  ): Promise<JsonResponse<PaginatedResult<ActivatedUserInStageDto>>> {
    return JsonResponseSerializer(
      await this.stageService.getActivatedUsersByStage(
        params.id,
        getActivatedUsersByStageDto.perPage,
        getActivatedUsersByStageDto.pageNumber,
        getActivatedUsersByStageDto.field,
        getActivatedUsersByStageDto.value,
        getActivatedUsersByStageDto.reservedFor,
      ),
    );
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createStage(@Body() data: CreateStageDto): Promise<JsonResponse<StageDto>> {
    return JsonResponseSerializer(await this.stageService.createStage(data));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateStage(
    @Param() params: StageParamDto,
    @Body() data: UpdateStageDto,
  ): Promise<JsonResponse<StageDto | null>> {
    return JsonResponseSerializer(await this.stageService.updateStage(params.id, data));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteStage(@Param() params: StageParamDto): Promise<JsonResponse<string>> {
    return JsonResponseSerializer(await this.stageService.deleteStage(params.id));
  }
}
