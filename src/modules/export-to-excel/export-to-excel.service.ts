import { Injectable, InternalServerErrorException } from '@nestjs/common';
import internal, { Stream } from 'stream';
import * as XLSX from 'xlsx';
import { ExportToExcelDto } from './dto/export-to-excel.dto';

@Injectable()
export class ExportToExcelService {
  // ===  How to use this service in controller === //
  /*
  async exportToExcel(@Res() res: Response) {
    const stream = await this.exportToExcelService.exportToExcel([{ name: 'test' }], 'Test Report');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');
    stream.pipe(res);
  }
  */
  async exportToExcel({ data, reportName }: ExportToExcelDto): Promise<internal.PassThrough> {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, reportName);

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      const stream = new Stream.PassThrough();
      stream.end(buffer);
      return stream;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create excel ${reportName}`);
    }
  }
}
