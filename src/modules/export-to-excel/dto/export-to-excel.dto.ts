export interface ExportToExcelDto {
  reportName: string;
  data: Record<string, string | number>[];
}
