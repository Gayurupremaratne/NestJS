import { StaticContentSignedUrlDto } from '@app/modules/static-content/dto/file-signed-url.dto';
import { SignedUrlResponseDto } from '@app/modules/static-content/dto/signed-url-response-dto';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { CONFIG_NAMESPACES } from '@common/constants';
import { getS3Client } from '@common/helpers';
import { IAppConfig } from '@common/types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { MockStaticContentRepository } from './static.content.repository';

@Injectable()
export class MockStaticContentService {
  private readonly appConfig: IAppConfig;
  private readonly s3Client: S3Client;

  constructor(
    private configService: ConfigService,
    private repository: MockStaticContentRepository,
  ) {
    this.appConfig = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP);
    this.s3Client = getS3Client();
  }
  async getSignedUrlForStaticMedia(
    reqBody: StaticContentSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    const uniqueFileName = `${uuid()}-${reqBody.fileName}`;
    const filePath = '/test';
    const s3Url = 'http//www.test.com';

    return { s3Url, filePath, uniqueFileName: uniqueFileName };
  }

  async s3DeleteObjects(assetKeys: string[]): Promise<any> {
    const deleteObjectsCommand = new DeleteObjectsCommand({
      Bucket: this.appConfig.AWS_BUCKET_NAME,
      Delete: {
        Objects: assetKeys.map((assetKey) => ({ Key: assetKey })),
      },
    });
    return deleteObjectsCommand;
  }

  async deleteAssetKeys(assetKeyId: string): Promise<any> {
    try {
      return await this.repository.deleteAssetEntry(assetKeyId);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
