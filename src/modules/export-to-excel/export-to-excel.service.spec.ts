import { Test, TestingModule } from '@nestjs/testing';
import { ExportToExcelService } from './export-to-excel.service';
import { ExportToExcelDto } from './dto/export-to-excel.dto';

describe('ExportToExcelService', () => {
  let service: ExportToExcelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportToExcelService],
    }).compile();

    service = module.get<ExportToExcelService>(ExportToExcelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create data stream to create excel report', () => {
    it('Create data buffer', async () => {
      const reportData: ExportToExcelDto = {
        data: [
          {
            name: 'Test',
            address: '123',
          },
        ],
        reportName: 'Test Report',
      };
      const data = await service.exportToExcel(reportData);

      expect(data.end).toBeTruthy();
    });
  });
});
