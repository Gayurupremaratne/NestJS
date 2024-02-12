import { Module } from '@nestjs/common';
import { GeojsonStaticContentService } from './geojson-static-content.service';
import { GeojsonStaticContentController } from './geojson-static-content.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [GeojsonStaticContentController],
  providers: [GeojsonStaticContentService, ConfigService],
})
export class GeojsonStaticContentModule {}
