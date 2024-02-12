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
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoryParamDto } from './dto/story-params.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetAllStoryDto, GetStoryByStageDto } from './dto/get-story.dto';
import { CreateStoryConsumptionDto } from './dto/create-story-consumptio.dto';
import { CustomAuthRequest } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('/story')
@UseInterceptors(new ResponseInterceptor())
@ApiTags('Story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get('en')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllStoryEn(@Query() data: GetAllStoryDto) {
    return JsonResponseSerializer(await this.storyService.getAllStoryEn(data));
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createStory(@Body() data: CreateStoryDto) {
    return JsonResponseSerializer(await this.storyService.createStory(data));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateStory(@Param() params: StoryParamDto, @Body() data: CreateStoryDto) {
    return JsonResponseSerializer(await this.storyService.updateStory(params.id, data));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteStory(@Param() params: StoryParamDto) {
    return JsonResponseSerializer(await this.storyService.deleteStory(params.id));
  }

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getStory(@Param() params: StoryParamDto) {
    return JsonResponseSerializer(await this.storyService.getStory(params.id));
  }

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllStory(@Query() data: GetAllStoryDto) {
    return JsonResponseSerializer(await this.storyService.getAllStory(data));
  }

  @Get('stage/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getStoriesByStage(@Param() data: GetStoryByStageDto) {
    return JsonResponseSerializer(await this.storyService.getStoryByStage(data.stageId));
  }

  @Put(':id/consumption')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async upsertStoryConsumption(
    @Param() params: StoryParamDto,
    @Req() req: CustomAuthRequest,
    @Body() data: CreateStoryConsumptionDto,
  ) {
    return JsonResponseSerializer(
      await this.storyService.upsertStoryConsumption(params.id, req.user.sub, data),
    );
  }
}
