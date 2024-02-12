export class StageSummaryReportResponseDto {
  summary: {
    totalInventoryQuantityForDay: number;
    totalPassQuantityForDay: number;
    totalRemainingQuantityForDay: number;
  };
  data: Array<StageSummaryData>;
}

export interface StageSummaryData {
  id: string;
  stageNumber: number;
  stageName: string;
  inventoryQuantity: number;
  passQuantity: number;
  remainingQuantity: number;
}
