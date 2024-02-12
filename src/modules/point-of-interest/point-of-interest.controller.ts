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
import { PointOfInterestService } from './point-of-interest.service';
import { JsonResponseSerializer } from '@common/serializers';
import { CreatePointOfInterestDto } from './dto/create-poi.dto';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PoiParamDto, PoiStageParamDto } from './dto/params-poi.dto';
import { GetPoiDto, GetPoiPaginationDto } from './dto/get-poi.dto';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { JsonResponse } from '@common/types/common.types';
import { AuthGuard } from '../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Points of Interest')
@Controller('point-of-interest')
export class PointOfInterestController {
  constructor(private readonly poiService: PointOfInterestService) {}

  @Get('random')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getRandomPointOfInterest(): Promise<JsonResponse<GetPoiDto[]>> {
    return JsonResponseSerializer(await this.poiService.getRandomPointsOfInterest());
  }

  @Get('en')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllPointOfInterestEn(@Query() query: GetPoiPaginationDto) {
    return JsonResponseSerializer(await this.poiService.getAllPointOfInterestEn(query));
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createPointOfInterest(@Body() data: CreatePointOfInterestDto) {
    return JsonResponseSerializer(await this.poiService.createPointOfInterest(data));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updatePointOfInterest(
    @Param() params: PoiParamDto,
    @Body() data: CreatePointOfInterestDto,
  ) {
    return JsonResponseSerializer(await this.poiService.updatePointOfInterest(params.id, data));
  }

  @Get('stage/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getPointOfInterestByStageId(
    @Param() params: PoiStageParamDto,
    @Query() query?: GetPoiPaginationDto,
  ) {
    return JsonResponseSerializer(
      await this.poiService.getPointOfInterestByStageId(params.stageId, query),
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getPointOfInterestById(@Param() params: PoiParamDto) {
    return JsonResponseSerializer(await this.poiService.getPointOfInterestById(params.id));
  }

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllPointOfInterest(@Query() query: GetPoiPaginationDto) {
    return JsonResponseSerializer(await this.poiService.getAllPointOfInterest(query));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.POINT_OF_INTEREST })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deletePointOfInterest(@Param() params: PoiParamDto) {
    return JsonResponseSerializer(await this.poiService.deletePointOfInterest(params.id));
  }
}
