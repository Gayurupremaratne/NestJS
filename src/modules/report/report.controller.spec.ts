import { AppConfig } from '@config/app-config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '@user/user.service';
import { PassThrough } from 'stream';
import { MockAuthGuard } from '../../common/mock-modules/auth.guard.mock';
import { AuthGuard } from '../casl/authorization-guard';
import { ExportToExcelService } from '../export-to-excel/export-to-excel.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserRepository } from '../user/user.repository';
import { ReportController } from './report.controller';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

jest.mock('moment', () => {
  return () => jest.requireActual('moment')('2022-10-01T00:00:00.000Z');
});

describe('ReportController', () => {
  let controller: ReportController;
  let reportService: ReportService;

  const queryParams = {
    stageId: '9ca8e370-1a43-4a9e-96cb-bdcd065cf043',
    reservedFor: '01-10-2023',
  };

  const dateRangeQueryParams = {
    reservedForStartDate: '2023-10-01',
    reservedForEndDate: '2023-10-02',
  };

  const closedStagesQueryParams = {
    closedStartDate: '2023-10-01',
    closedEndDate: '2023-10-02',
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [ReportController],
      providers: [
        ReportService,
        ReportRepository,
        PassesService,
        PrismaService,
        ExportToExcelService,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        StaticContentService,
        StaticContentRepository,
        KeycloakService,
        UserRepository,
        ConfigService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    reportService = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get the stage wise summary report report', async () => {
    const response = await controller.getStageWiseSummaryReport(queryParams);

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should get all stages passes summary report', async () => {
    const response = await controller.getStageSummaryReport(dateRangeQueryParams);

    expect(response.summary).toStrictEqual({
      totalInventoryQuantityForDay: expect.any(Number),
      totalPassQuantityForDay: expect.any(Number),
      totalRemainingQuantityForDay: expect.any(Number),
    });
  });

  it('should return excel file as stream with all stage summary passes', async () => {
    const mockStream = new Promise<PassThrough>((resolve) => {
      const passThrough = new PassThrough();
      passThrough.pipe = jest.fn();
      resolve(passThrough);
    });
    jest.spyOn(reportService, 'getStageSummaryReportDownload').mockResolvedValue(mockStream);
    await controller.getDownloadableStagesSummaryReport(dateRangeQueryParams, {
      setHeader: jest.fn(),
    });
    expect(reportService.getStageSummaryReportDownload).toHaveBeenCalledWith(
      dateRangeQueryParams.reservedForStartDate,
      dateRangeQueryParams.reservedForEndDate,
    );
  });

  it('should get the cancelled passes report report', async () => {
    const response = await controller.getCancelledPassesReport(queryParams);

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should get all stages passes summary report', async () => {
    const response = await controller.getClosedStagesSummaryReport(closedStagesQueryParams);

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should return excel file as stream with all closed stages', async () => {
    const mockStream = new Promise<PassThrough>((resolve) => {
      const passThrough = new PassThrough();
      passThrough.pipe = jest.fn();
      resolve(passThrough);
    });
    jest.spyOn(reportService, 'getClosedStagesReportDownload').mockResolvedValue(mockStream);
    await controller.getDownloadableClosedStagesSummaryReport(closedStagesQueryParams, {
      setHeader: jest.fn(),
    });
    expect(reportService.getClosedStagesReportDownload).toHaveBeenCalledWith(
      closedStagesQueryParams.closedStartDate,
      closedStagesQueryParams.closedEndDate,
    );
  });
});
