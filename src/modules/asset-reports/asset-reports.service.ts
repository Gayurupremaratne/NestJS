import { HttpException, Injectable } from '@nestjs/common';
import { ReportAssetDto } from './dto/report-asset.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import * as Sentry from '@sentry/node';
import { PaginateFunction, PaginatedResult, getS3Client, paginator } from '@common/helpers';
import { GetReportAssetsDto } from './dto/get-report-assets.dto';
import { IAppConfig } from '@common/types';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { CONFIG_NAMESPACES } from '@common/constants';
import { AssetReport, Prisma } from '@prisma/client';
import { parseSortOrder } from '@common/helpers/parse-sort';

@Injectable()
export class AssetReportsService {
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
   * Report Asset
   *
   * @param {ReportAssetDto} createAssetReportDto
   * @param {string} userId
   * @return {*}
   * @memberof AssetReportsService
   */
  async reportAsset(reportAssetBody: ReportAssetDto, userId: string): Promise<AssetReport> {
    try {
      const { fileKey, comment } = reportAssetBody;

      const createOrUpdateReport = await this.prisma.assetReport.upsert({
        where: { fileKey: fileKey },
        update: {
          assetReportUser: { create: { comment: comment, userId: userId } },
        },
        create: {
          fileKey: fileKey,
          assetReportUser: { create: { comment: comment, userId: userId } },
        },
      });

      return createOrUpdateReport;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new HttpException(
            'You have already reported this asset. Please wait for the admin to review it.',
            500,
          );
        }
      }
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      throw new HttpException(error.message, error.status || 500);
    }
  }

  /**
   * Find All Report Assets
   *
   * @param {number} perPage
   * @param {number} pageNumber
   * @param {string} status
   * @return {*}  {Promise<PaginatedResult<GetReportAssetsDto[]>>}
   * @memberof AssetReportsService
   */
  async findAll(
    perPage: number,
    pageNumber: number,
    status: string,
    sortBy: string,
  ): Promise<PaginatedResult<GetReportAssetsDto>> {
    try {
      const paginate: PaginateFunction = paginator({ perPage });

      return await paginate(
        this.prisma.assetReport,
        {
          include: {
            _count: {
              select: { assetReportUser: true },
            },
            assetReportUser: {
              take: 1,
              select: { user: { select: { firstName: true, lastName: true } }, reportedDate: true },
            },
          },
          orderBy: parseSortOrder(sortBy, 'AssetReport'),
          where: status ? { status: status } : {},
        },
        { page: pageNumber },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async getReportedUsersByAsset(
    perPage: number,
    pageNumber: number,
    reportId: string,
    sortBy: string,
  ) {
    try {
      const paginate: PaginateFunction = paginator({ perPage });

      return await paginate(
        this.prisma.assetReportUser,
        {
          where: { assetReportId: reportId },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: parseSortOrder(sortBy, 'AssetReportUser'),
        },
        { page: pageNumber },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      throw new HttpException(error.message, error.status || 500);
    }
  }

  /**
   * Remove Asset
   *
   * @param {string} fileKey
   * @return {*}  {Promise<boolean>}
   * @memberof AssetReportsService
   */
  async removeAsset(fileKey: string): Promise<AssetReport> {
    try {
      let removingAsset: AssetReport;
      await this.prisma.$transaction(async (tx) => {
        // nullifying the fileKey in the Asset table
        removingAsset = await tx.assetReport.update({
          where: { fileKey: fileKey },
          data: { fileKey: null, status: 'REMOVED' },
        });

        // remove the enrty from the Asset table
        await tx.assetKeys.delete({ where: { fileKey: fileKey } });
      });

      // delete the asset from the S3 bucket
      const deleteObjparammeters = {
        Bucket: this.appConfig.AWS_BUCKET_NAME,
        Key: fileKey,
      };
      await this.s3Client.send(new DeleteObjectCommand(deleteObjparammeters));

      return removingAsset;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      throw new HttpException(error.message, error.status || 500);
    }
  }

  /**
   * Resolve Asset
   *
   * @param {string} fileKey
   * @return {*}  {Promise<ReportAssetDto>}
   * @memberof AssetReportsService
   */
  async resolveAsset(fileKey: string): Promise<AssetReport> {
    try {
      const resolvedReport = await this.prisma.assetReport.update({
        where: { fileKey: fileKey },
        data: { status: 'RESOLVED' },
      });
      return resolvedReport;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'asset-reports' }, level: 'error' });
      throw new HttpException(error.message, error.status || 500);
    }
  }
}
