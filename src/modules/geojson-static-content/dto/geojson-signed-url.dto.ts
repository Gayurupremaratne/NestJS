import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StaticContentGeoJsonStageUrlDto {
  @IsString()
  @ApiProperty()
  fileKey?: string;
}
