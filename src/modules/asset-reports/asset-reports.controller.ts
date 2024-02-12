import { Controller, Get, Post, Body, Query, Put, UseGuards } from '@nestjs/common';
import { AssetReportsService } from './asset-reports.service';
import { ReportAssetDto } from './dto/report-asset.dto';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { JsonResponseSerializer } from '@common/serializers';
import { plainToInstance } from 'class-transformer';
import { JsonResponse } from '@common/types';
import { GetReportAssetsDto } from './dto/get-report-assets.dto';
import { RemoveorResolveReportAssetDto } from './dto/remove-or-resolve-report-asset.dto';
import { $Enums } from '@prisma/client';
import { RequestQueryParamsDto } from './dto/request-query-params.dto';
import { FileReportStatusCheck } from '@common/validators/FileReportStatusCheck';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RequestReportedUsersDto } from './dto/request-reported-users.dto';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('asset-reports')
@ApiTags('Asset Reports')
export class AssetReportsController {
  constructor(private readonly assetReportsService: AssetReportsService) {}

  /**
   * Report Asset
   *
   * @param {ReportAssetDto} reportAssetBody
   * @param {*} user
   * @return {*}  {Promise<JsonResponse<ReportAssetDto>>}
   * @memberof AssetReportsController
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async reportAsset(
    @Body() reportAssetBody: ReportAssetDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<ReportAssetDto>> {
    return JsonResponseSerializer(
      plainToInstance(
        ReportAssetDto,
        await this.assetReportsService.reportAsset(reportAssetBody, user.sub),
      ),
    );
  }

  /**
   * Find All Report Assets
   *
   * @param {number} perPage
   * @param {number} pageNumber
   * @param {string} [status]
   * @return {*}  {Promise<JsonResponse<GetReportAssetsDto>>}
   * @memberof AssetReportsController
   */
  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.REPORTED_IMAGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  @ApiQuery({
    name: 'status',
    type: String,
    description: 'Status parameter for filtering',
    required: false,
    enum: $Enums.FILE_REPORT_STATUS,
  })
  async findAllReportAssets(
    @Query() queryData: RequestQueryParamsDto,
  ): Promise<JsonResponse<GetReportAssetsDto>> {
    return JsonResponseSerializer(
      plainToInstance(
        GetReportAssetsDto,
        await this.assetReportsService.findAll(
          queryData.perPage,
          queryData.pageNumber,
          queryData.status,
          queryData.sortBy,
        ),
      ),
    );
  }

  @Get('users')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.REPORTED_IMAGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  @UseGuards(AuthGuard)
  async getReportedUsersByAsset(@Query() queryData: RequestReportedUsersDto) {
    return JsonResponseSerializer(
      plainToInstance(
        GetReportAssetsDto,
        await this.assetReportsService.getReportedUsersByAsset(
          queryData.perPage,
          queryData.pageNumber,
          queryData.reportId,
          queryData.sortBy,
        ),
      ),
    );
  }

  /**
   * Remove Asset
   *
   * @param {RemoveorResolveReportAssetDto} removeAssetBody
   * @return {*}
   * @memberof AssetReportsController
   */
  @Put('change-status')
  @ApiBearerAuth()
  @UseGuards(FileReportStatusCheck)
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.REPORTED_IMAGES })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async changeStatus(
    @Body() removeAssetBody: RemoveorResolveReportAssetDto,
  ): Promise<JsonResponse<ReportAssetDto>> {
    if (removeAssetBody.status === $Enums.FILE_REPORT_STATUS.RESOLVED) {
      return JsonResponseSerializer(
        plainToInstance(
          ReportAssetDto,
          await this.assetReportsService.resolveAsset(removeAssetBody.fileKey),
        ),
      );
    } else if (removeAssetBody.status === $Enums.FILE_REPORT_STATUS.REMOVED) {
      return JsonResponseSerializer(
        plainToInstance(
          ReportAssetDto,
          await this.assetReportsService.removeAsset(removeAssetBody.fileKey),
        ),
      );
    }
  }
}
