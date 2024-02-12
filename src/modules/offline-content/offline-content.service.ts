import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IAppConfig } from '@common/types';
import { ConfigService } from '@nestjs/config';
import { CONFIG_NAMESPACES } from '@common/constants';
import { generateS3SignedUrl, getS3Client } from '@common/helpers';
import { StoryMediaResponseDto } from './dto/response/story-media-response.dto';

@Injectable()
export class OfflineContentService {
  private readonly appConfig: IAppConfig;
  private readonly s3Client: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.appConfig = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP);
    this.s3Client = getS3Client();
  }

  /**
   * Find story media for a stage
   *
   * @param {string} stageId
   * @param {string} language
   * @return {*}  {Promise<StoryMediaResponseDto[]>}
   * @memberof OfflineContentService
   */
  async findStoryMediaForStage(
    stageId: string,
    language: string,
  ): Promise<StoryMediaResponseDto[]> {
    try {
      const signedUrlArrayForStoryMedia: StoryMediaResponseDto[] = [];
      const storyMediaKeys = await this.prisma.stageStory.findMany({
        where: { stageId: stageId, stageStoryTranslations: { some: { localeId: language } } },
        include: {
          stageStoryTranslations: {
            where: { localeId: language },
            select: { audioKey: true, title: true, description: true },
          },
        },
      });

      // Extract media keys from the result
      const mediaKeysList = storyMediaKeys.flatMap((result) => {
        return result.stageStoryTranslations.map((translation) => ({
          audioKey: translation.audioKey,
          title: translation.title,
          description: translation.description,
          latitude: result.latitude,
          longitude: result.longitude,
          id: result.id,
        }));
      });

      // Generate signed url for each media key
      for (const item of mediaKeysList) {
        const putObjectCommand = new GetObjectCommand({
          Bucket: this.appConfig.AWS_BUCKET_NAME,
          Key: item.audioKey,
          ResponseContentType: 'audio/mpeg',
        });

        const metaDataObject = new HeadObjectCommand({
          Bucket: this.appConfig.AWS_BUCKET_NAME,
          Key: item.audioKey,
        });

        const { ContentLength } = await this.s3Client.send(metaDataObject);

        const s3Url = await generateS3SignedUrl(this.s3Client, putObjectCommand);

        signedUrlArrayForStoryMedia.push({
          id: item.id,
          s3Url: s3Url,
          title: item.title,
          description: item.description,
          fileSize: ContentLength,
          fileKey: item.audioKey,
          latitude: item.latitude,
          longitude: item.longitude,
        });
      }

      return signedUrlArrayForStoryMedia;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }
}
