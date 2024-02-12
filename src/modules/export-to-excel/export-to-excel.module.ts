import { Module } from '@nestjs/common';
import { ExportToExcelService } from './export-to-excel.service';

@Module({
  providers: [ExportToExcelService],
})
export class ExportToExcelModule {}
