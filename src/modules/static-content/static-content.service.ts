import {
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { CONFIG_NAMESPACES, STATIC_CONTENT_PATHS } from '@common/constants';
import { generateS3SignedUrl, getS3Client } from '@common/helpers';
import { IAppConfig } from '@common/types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { CreateAssetDto } from './dto/create-asset.dto';
import { StaticContentSignedUrlDto } from './dto/file-signed-url.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response-dto';
import { StaticContentRepository } from './static-content.repository';
import { fileSizeValidator } from '@common/validators/fileSizeValidator';

@Injectable()
export class StaticContentService {
  private readonly appConfig: IAppConfig;
  private readonly s3Client: S3Client;

  constructor(
    private configService: ConfigService,
    private repository: StaticContentRepository,
  ) {
    this.appConfig = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP);
    this.s3Client = getS3Client();
  }
  async getSignedUrlForStaticMedia(
    reqBody: StaticContentSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    // validate the file size
    fileSizeValidator(reqBody.fileSize);
    const nonUniqueModules = [
      STATIC_CONTENT_PATHS.KML_STAGE_MEDIA,
      STATIC_CONTENT_PATHS.KML_OTHER_MEDIA,
    ];

    const uniqueFileName = nonUniqueModules.includes(reqBody.module)
      ? `${reqBody.fileName}`
      : `${uuid()}-${reqBody.fileName}`;
    let filePath: string;

    if (Object.values(STATIC_CONTENT_PATHS).includes(reqBody.module)) {
      filePath = reqBody.module;
    } else {
      filePath = STATIC_CONTENT_PATHS.OTHERS;
    }

    //check the key with the asset table
    const assetData: CreateAssetDto = {
      fileKey: `${filePath}/${uniqueFileName}`,
      module: reqBody.module,
    };

    //create asset table record
    await this.repository.createAssetEntry(assetData);

    // configs for the presigned url
    const putObjectCommand = new PutObjectCommand({
      Bucket: this.appConfig.AWS_BUCKET_NAME,
      Key: `${filePath}/${uniqueFileName}`,
      ContentType: reqBody.contentType,
      ContentLength: reqBody.fileSize,
    });

    const s3Url = await generateS3SignedUrl(this.s3Client, putObjectCommand);

    return { s3Url, filePath, uniqueFileName: uniqueFileName };
  }

  async s3DeleteObjects(assetKeys: string[]): Promise<DeleteObjectsCommandOutput> {
    try {
      const deleteObjectsCommand = new DeleteObjectsCommand({
        Bucket: this.appConfig.AWS_BUCKET_NAME,
        Delete: {
          Objects: assetKeys.map((assetKey) => ({ Key: assetKey })),
        },
      });
      return await this.s3Client.send(deleteObjectsCommand);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async deleteAssetKeys(fileKey: string): Promise<any> {
    try {
      return await this.repository.deleteAssetEntry(fileKey);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
