import { Optional } from '@nestjs/common';

export class GeoJsonStageSignedUrlResponseDto {
  s3Url?: string;

  @Optional()
  fileName: string;
}
