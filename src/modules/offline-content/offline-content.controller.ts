import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { OfflineContentService } from './offline-content.service';
import { StoryMediaRequestDto } from './dto/request/story-media-request.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JsonResponseSerializer } from '@common/serializers';
import { StoryMediaResponseDto } from './dto/response/story-media-response.dto';
import { JsonResponse } from '@common/types';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('offline-content')
@ApiTags('Offline Content')
export class OfflineContentController {
  constructor(private readonly offlineContentService: OfflineContentService) {}

  @Get('story-media/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async findStageStoryMediaByStageId(
    @Param() params: StoryMediaRequestDto,
    @Request() req: Request,
  ): Promise<JsonResponse<StoryMediaResponseDto[]>> {
    const { stageId } = params;
    const language = req.headers['accept-language'] || 'en';

    return JsonResponseSerializer(
      await this.offlineContentService.findStoryMediaForStage(stageId, language),
    );
  }
}
