import { Injectable } from '@nestjs/common';
import { getName } from 'country-list';
import { ReportRepository } from './report.repository';
import { StageWiseSummaryReportDto } from './dto/stage-wise-summary-report.dto';
import { plainToInstance } from 'class-transformer';
import { ExportToExcelDto } from '../export-to-excel/dto/export-to-excel.dto';
import moment from 'moment';
import { ExportToExcelService } from '../export-to-excel/export-to-excel.service';
import internal from 'stream';
import { StageSummaryReportResponseDto } from './dto/stage-report-response.dto';
import { CancelledPassDto } from './dto/cancelled-passes.dto';
import { ClosedStagesDto } from './dto/closed-stages.dto';

@Injectable()
export class ReportService {
  constructor(
    private reportRepository: ReportRepository,
    private exportToExcelService: ExportToExcelService,
  ) {}
  async getStageWiseSummaryReport(
    stageId: string,
    reservedFor: string,
  ): Promise<StageWiseSummaryReportDto[]> {
    return plainToInstance(
      StageWiseSummaryReportDto,
      await this.reportRepository.getStageWiseSummaryReport(stageId, reservedFor),
    );
  }

  async getDownloadableStageWiseSummaryReport(
    stageId: string,
    reservedFor: string,
  ): Promise<internal.PassThrough> {
    const data = await this.reportRepository.getStageWiseSummaryReport(stageId, reservedFor);
    const reportData: ExportToExcelDto = {
      data: [],
      reportName: 'stage-wise-summary-report',
    };
    let total = 0;

    data.forEach((data) => {
      total += data.passCount;
      const isoDate = new Date(data.bookingDate).toISOString();
      const date = new Intl.DateTimeFormat('en-US').format(new Date(isoDate));
      const formattedDate = moment(new Date(date)).format('DD-MM-YYYY');

      reportData.data.push({
        Name: data.user.firstName + ' ' + data.user.lastName,
        'Reserved passes': data.passCount,
        Country: getName(data.user.nationalityCode) ?? data.user.nationalityCode,
        'Booking date': formattedDate,
      });
    });

    reportData.data.push({
      Name: 'Total reserved passes',
      'Reserved passes': total,
    });

    return await this.exportToExcelService.exportToExcel(reportData);
  }

  async getStageSummaryReport(
    reservedForStartDate: string,
    reservedForEndDate: string,
  ): Promise<StageSummaryReportResponseDto> {
    return plainToInstance(
      StageSummaryReportResponseDto,
      await this.reportRepository.getStageSummaryReport(reservedForStartDate, reservedForEndDate),
    );
  }

  async getStageSummaryReportDownload(
    reservedForStartDate: string,
    reservedForEndDate: string,
  ): Promise<internal.PassThrough> {
    const { summary, data } = await this.reportRepository.getStageSummaryReport(
      reservedForStartDate,
      reservedForEndDate,
    );

    const reportData: ExportToExcelDto = {
      data: [],
      reportName: `${reservedForStartDate}-${reservedForEndDate}-summary`,
    };

    data.forEach((data) => {
      reportData.data.push({
        Trail: `STAGE ${data.stageNumber} ${data.stageName}`,
        'Total passes': data.inventoryQuantity,
        'Allocated passes': data.passQuantity,
        'Remaining passes': data.remainingQuantity,
      });
    });

    reportData.data.push({
      Trail: `Total Passes`,
      'Total passes': summary.totalInventoryQuantityForDay,
      'Allocated passes': summary.totalPassQuantityForDay,
      'Remaining passes': summary.totalRemainingQuantityForDay,
    });

    return await this.exportToExcelService.exportToExcel(reportData);
  }

  async getCancelledPassesReport(
    stageId: string,
    reservedFor: string,
  ): Promise<CancelledPassDto[]> {
    return plainToInstance(
      CancelledPassDto,
      await this.reportRepository.getCancelledPassesReport(stageId, reservedFor),
    );
  }

  async getDownloadableCancelledPassesReport(
    stageId: string,
    reservedFor: string,
  ): Promise<internal.PassThrough> {
    const data = await this.reportRepository.getCancelledPassesReport(stageId, reservedFor);
    const reportData: ExportToExcelDto = {
      data: [],
      reportName: 'cancelled-passes-report',
    };
    let total = 0;

    data.forEach((data) => {
      total += data.passesCount;
      const date = new Intl.DateTimeFormat('en-US').format(data.cancelledDate);
      const formattedDate = moment(new Date(date)).format('DD-MM-YYYY');

      reportData.data.push({
        Name: data.user.firstName + ' ' + data.user.lastName,
        'Cancelled passes': data.passesCount,
        Country: getName(data.user.nationalityCode) ?? data.user.nationalityCode,
        'Cancelled date': formattedDate,
      });
    });

    reportData.data.push({
      Name: 'Total cancelled passes',
      'Cancelled passes': total,
    });

    return await this.exportToExcelService.exportToExcel(reportData);
  }

  async getClosedStagesReport(
    ClosedStartDate: string,
    ClosedEndDate: string,
  ): Promise<ClosedStagesDto[]> {
    return plainToInstance(
      ClosedStagesDto,
      await this.reportRepository.getClosedStagesReport(ClosedStartDate, ClosedEndDate),
    );
  }

  async getClosedStagesReportDownload(
    ClosedStartDate: string,
    ClosedEndDate: string,
  ): Promise<internal.PassThrough> {
    const data = await this.reportRepository.getClosedStagesReport(ClosedStartDate, ClosedEndDate);

    const reportData: ExportToExcelDto = {
      data: [],
      reportName: `closed-stages-summary-report`,
    };

    data.forEach((data) => {
      reportData.data.push({
        Trail: `STAGE ${data.stageNumber} - ${data.stageHead} / ${data.stageTail}`,
        'Closed date': data.closedDate,
        'Closed reason': data.closeReason,
      });
    });

    return await this.exportToExcelService.exportToExcel(reportData);
  }
}
