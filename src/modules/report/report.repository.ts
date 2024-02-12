import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PassesService } from '../passes/passes.service';
import { CancelledPassDto } from './dto/cancelled-passes.dto';
import { ClosedStagesDto } from './dto/closed-stages.dto';
import { StageSummaryReportResponseDto } from './dto/stage-report-response.dto';
import { StageWiseSummaryReportDto } from './dto/stage-wise-summary-report.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class ReportRepository {
  constructor(
    private passService: PassesService,
    private prismaService: PrismaService,
  ) {}

  async getStageWiseSummaryReport(
    stageId: string,
    reservedFor: string,
  ): Promise<StageWiseSummaryReportDto[]> {
    return await this.passService.getStageWiseSummaryReport(stageId, reservedFor);
  }

  async getStageSummaryReport(
    reservedForStartDate: string,
    reservedForEndDate: string,
  ): Promise<StageSummaryReportResponseDto> {
    const startDate = new Date(reservedForStartDate);
    const endDate = new Date(reservedForEndDate);
    try {
      const stageData = await this.prismaService.$queryRaw<
        StageSummaryReportResponseDto['data']
      >` WITH InventorySubquery AS (
        SELECT
          stages.id AS stageId,
          COALESCE(CAST(SUM(pass_inventories.quantity) AS INTEGER), 0) AS inventoryQuantity
        FROM
          stages
          LEFT JOIN pass_inventories ON pass_inventories.stage_id = stages.id
        WHERE
          pass_inventories.date BETWEEN ${startDate}
          AND ${endDate}
        GROUP BY
          stages.id
      ),
      PassSubquery AS (
        SELECT
          stages.id AS stageId,
          COALESCE(CAST(COUNT(p.id) AS INTEGER), 0) AS passQuantity
        FROM
          stages
          LEFT JOIN passes p ON p.reserved_for BETWEEN ${startDate}
          AND ${endDate}
          AND p.stage_id = stages.id
          AND p.is_cancelled = FALSE
        GROUP BY
          stages.id
      )
      SELECT
          s.id,
          s."number" AS "stageNumber",
          st.stage_head || ' / ' || st.stage_tail AS "stageName",
          COALESCE(i.inventoryQuantity, 0) AS "inventoryQuantity",
          COALESCE(p.passQuantity, 0) AS "passQuantity",
          COALESCE(i.inventoryQuantity, 0) - COALESCE(p.passQuantity, 0) AS "remainingQuantity"
      FROM
          stages s
          LEFT JOIN stage_translations st ON st.stage_id = s.id
          AND st.locale_id = 'en'
          LEFT JOIN InventorySubquery i ON i.stageId = s.id
          LEFT JOIN PassSubquery p ON p.stageId = s.id
      ORDER BY
          s."number";
     `;

      let totalInventoryQuantityForDay = 0;
      let totalPassQuantityForDay = 0;
      let totalRemainingQuantityForDay = 0;

      stageData.forEach((stage) => {
        totalInventoryQuantityForDay += stage.inventoryQuantity;
        totalPassQuantityForDay += stage.passQuantity;
        totalRemainingQuantityForDay += stage.remainingQuantity;
      });

      return {
        data: stageData,
        summary: {
          totalInventoryQuantityForDay,
          totalPassQuantityForDay,
          totalRemainingQuantityForDay,
        },
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'report' }, level: 'error' });
      throw new InternalServerErrorException('Something went wrong while fetching the request');
    }
  }

  async getCancelledPassesReport(
    stageId: string,
    reservedFor: string,
  ): Promise<CancelledPassDto[]> {
    return await this.passService.getCancelledPassesReport(stageId, reservedFor);
  }

  async getClosedStagesReport(
    ClosedStartDate: string,
    ClosedEndDate: string,
  ): Promise<ClosedStagesDto[]> {
    try {
      const startDate = new Date(ClosedStartDate).toISOString();
      const endDate = new Date(ClosedEndDate).toISOString();

      const closedStages = await this.prismaService.$queryRaw<ClosedStagesDto[]>`
      SELECT
        stage.id as "stageId",
        stage.number as "stageNumber",
        stageTranslation.stage_head as "stageHead",
        stageTranslation.stage_tail as "stageTail",
        stageClosure.reason as "closeReason",
        stageClosure.closed_date as "closedDate"
      FROM
        stages as stage
      JOIN
        stage_translations as stageTranslation ON stage.id = stageTranslation.stage_id
      JOIN
        stage_closure as stageClosure ON stage.id = stageClosure.stage_id
      WHERE
        stageClosure.closed_date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY stageClosure.closed_date ASC;
    `;

      return closedStages;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'report' }, level: 'error' });
      throw new InternalServerErrorException('Something went wrong while fetching the request');
    }
  }
}
