import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { StageWiseReportQueryParamsDto } from './dto/stage-wise-report-query-params.dto';
import { StageWiseSummaryReportDto } from './dto/stage-wise-summary-report.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { StageReportQueryParamsDto } from './dto/stage-report-query-params.dto';
import { StageSummaryReportResponseDto } from './dto/stage-report-response.dto';
import { CancelledPassQueryParamsDto } from './dto/cancelled-passes-query-params.dto';
import { CancelledPassDto } from './dto/cancelled-passes.dto';
import { AuthGuard } from '../casl/authorization-guard';
import { ClosedStagesDto } from './dto/closed-stages.dto';
import { ClosedStagesQueryParamsDto } from './dto/closed-stages-query-params.dto';

@Controller('reports')
@ApiTags('Reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @ApiBearerAuth()
  @Get('stage-wise-summary')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STAGE_WISE_SUMMARY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getStageWiseSummaryReport(
    @Query() queryParams: StageWiseReportQueryParamsDto,
  ): Promise<StageWiseSummaryReportDto[]> {
    return await this.reportService.getStageWiseSummaryReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );
  }

  @ApiBearerAuth()
  @Get('stage-wise-summary/download')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STAGE_WISE_SUMMARY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getDownloadableStageWiseSummaryReport(
    @Query() queryParams: StageWiseReportQueryParamsDto,
    @Res() response,
  ): Promise<void> {
    const stream = await this.reportService.getDownloadableStageWiseSummaryReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    this.setResponseHeaders(response);
    stream.pipe(response);
  }

  @ApiBearerAuth()
  @Get('stages-summary')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STAGE_WISE_SUMMARY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getStageSummaryReport(
    @Query() queryParams: StageReportQueryParamsDto,
  ): Promise<StageSummaryReportResponseDto> {
    return await this.reportService.getStageSummaryReport(
      queryParams.reservedForStartDate,
      queryParams.reservedForEndDate,
    );
  }

  @ApiBearerAuth()
  @Get('stages-summary/download')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.STAGE_WISE_SUMMARY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getDownloadableStagesSummaryReport(
    @Query() queryParams: StageReportQueryParamsDto,
    @Res() response,
  ): Promise<void> {
    const stream = await this.reportService.getStageSummaryReportDownload(
      queryParams.reservedForStartDate,
      queryParams.reservedForEndDate,
    );

    this.setResponseHeaders(response);
    stream.pipe(response);
  }

  @ApiBearerAuth()
  @Get('cancelled-passes')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.CANCELLED_PASSES_REPORT })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getCancelledPassesReport(
    @Query() queryParams: CancelledPassQueryParamsDto,
  ): Promise<CancelledPassDto[]> {
    return await this.reportService.getCancelledPassesReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );
  }

  @ApiBearerAuth()
  @Get('cancelled-passes/download')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.CANCELLED_PASSES_REPORT })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getDownloadableCancelledPassesReport(
    @Query() queryParams: CancelledPassQueryParamsDto,
    @Res() response,
  ): Promise<void> {
    const stream = await this.reportService.getDownloadableCancelledPassesReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    this.setResponseHeaders(response);
    stream.pipe(response);
  }

  @ApiBearerAuth()
  @Get('closed-stages-summary')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.CLOSED_STAGES_REPORT })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getClosedStagesSummaryReport(
    @Query() queryParams: ClosedStagesQueryParamsDto,
  ): Promise<ClosedStagesDto[]> {
    return await this.reportService.getClosedStagesReport(
      queryParams.closedStartDate,
      queryParams.closedEndDate,
    );
  }

  @ApiBearerAuth()
  @Get('closed-stages-summary/download')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.CLOSED_STAGES_REPORT })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getDownloadableClosedStagesSummaryReport(
    @Query() queryParams: ClosedStagesQueryParamsDto,
    @Res() response,
  ): Promise<void> {
    const stream = await this.reportService.getClosedStagesReportDownload(
      queryParams.closedStartDate,
      queryParams.closedEndDate,
    );

    this.setResponseHeaders(response);
    stream.pipe(response);
  }

  private setResponseHeaders(response) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');
  }
}
