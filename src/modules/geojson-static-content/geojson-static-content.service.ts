import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GeoJsonStageSignedUrlResponseDto } from './dto/geojson-stage-signedurl-response.dto';
import { GetObjectCommand, ListObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { CONFIG_NAMESPACES, STATIC_CONTENT_PATHS } from '@common/constants';
import { generateS3SignedUrl, getS3Client } from '@common/helpers';
import { IAppConfig } from '@common/types';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class GeojsonStaticContentService {
  private readonly appConfig: IAppConfig;
  private readonly s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.appConfig = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP);
    this.s3Client = getS3Client();
  }
  async getSignedUrlForGeoJsonStage(fileKey: string): Promise<GeoJsonStageSignedUrlResponseDto> {
    try {
      const putObjectCommand = new GetObjectCommand({
        Bucket: this.appConfig.AWS_BUCKET_NAME,
        Key: fileKey,
        ResponseContentType: 'application/json',
      });

      const s3Url = await generateS3SignedUrl(this.s3Client, putObjectCommand);

      return { s3Url: s3Url } as GeoJsonStageSignedUrlResponseDto;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { module: 'geojson-static-content' },
        level: 'error',
      });
      throw new InternalServerErrorException(error.message);
    }
  }

  async getSignedUrlForGeoJsonOther(): Promise<GeoJsonStageSignedUrlResponseDto[]> {
    try {
      const signedUrlArrayForOtherGeojsonFiles: GeoJsonStageSignedUrlResponseDto[] = [];
      const command = new ListObjectsCommand({
        Bucket: this.appConfig.AWS_BUCKET_NAME,
        Prefix: `${STATIC_CONTENT_PATHS.KML_OTHER_MEDIA}`,
      });

      const s3Files = await this.s3Client.send(command);

      for (const fileName of s3Files.Contents) {
        const putObjectCommand = new GetObjectCommand({
          Bucket: this.appConfig.AWS_BUCKET_NAME,
          Key: fileName.Key,
          ResponseContentType: 'application/json',
        });

        const s3Url = await generateS3SignedUrl(this.s3Client, putObjectCommand);

        signedUrlArrayForOtherGeojsonFiles.push({ s3Url: s3Url, fileName: fileName.Key });
      }

      return signedUrlArrayForOtherGeojsonFiles;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
