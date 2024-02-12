import { Controller, Get, Post, Body } from '@nestjs/common';
import { GeojsonStaticContentService } from './geojson-static-content.service';
import { StaticContentGeoJsonStageUrlDto } from './dto/geojson-signed-url.dto';
import { GeoJsonStageSignedUrlResponseDto } from './dto/geojson-stage-signedurl-response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('GeoJson Static Content')
@Controller('geojson-static-content')
export class GeojsonStaticContentController {
  constructor(private readonly geojsonStaticContentService: GeojsonStaticContentService) {}

  @Post('geojson-signed-url/stage')
  @ApiBearerAuth()
  async getSignedUrlForGeoJsonStage(
    @Body() reqBody: StaticContentGeoJsonStageUrlDto,
  ): Promise<GeoJsonStageSignedUrlResponseDto> {
    return await this.geojsonStaticContentService.getSignedUrlForGeoJsonStage(reqBody.fileKey);
  }

  @Get('geojson-signed-url/other')
  @ApiBearerAuth()
  async getSignedUrlForGeoJsonOther(): Promise<GeoJsonStageSignedUrlResponseDto[]> {
    return await this.geojsonStaticContentService.getSignedUrlForGeoJsonOther();
  }
}
