import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { ExportToExcelService } from '../export-to-excel/export-to-excel.service';
import { PassesService } from '../passes/passes.service';
import { CancelledPassDto } from './dto/cancelled-passes.dto';
import { ClosedStagesDto } from './dto/closed-stages.dto';
import { StageSummaryReportResponseDto } from './dto/stage-report-response.dto';
import { StageWiseSummaryReportDto } from './dto/stage-wise-summary-report.dto';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';

jest.mock('moment', () => {
  return () => jest.requireActual('moment')('2022-10-01T00:00:00.000Z');
});

describe('ReportService', () => {
  let service: ReportService;

  const queryParams = {
    stageId: '9ca8e370-1a43-4a9e-96cb-bdcd065cf043',
    reservedFor: '01-10-2023',
    ClosedStartDate: '2023-10-01',
    ClosedEndDate: '2023-10-25',
  };

  const res: StageWiseSummaryReportDto[] = [
    {
      bookingDate: new Date('10-10-2023'),
      passCount: 1,
      reservedFor: new Date('10-10-2023'),
      stageId: 'stageId',
      user: {
        id: '5e5fcf1d-5d32-4066-9fcd-f46860ef56c0',
        firstName: 'test',
        lastName: 'test',
        nationalityCode: 'FR',
      },
    },
    {
      bookingDate: new Date('10-10-2023'),
      passCount: 2,
      reservedFor: new Date('10-10-2023'),
      stageId: 'stageId',
      user: {
        id: '5e5fcf1d-5d32-4066-9fcd-f46860ef56c0',
        firstName: 'test',
        lastName: 'test',
        nationalityCode: 'FR',
      },
    },
  ];

  const cancelledPassesResponse: CancelledPassDto[] = [
    {
      cancelledDate: new Date('2023-09-21T00:00:00.000Z'),
      passesCount: 2,
      user: {
        id: '5e5fcf1d-5d32-4066-9fcd-f46860ef56c1',
        lastName: 'User',
        firstName: 'Test',
        nationalityCode: 'FR',
      },
    },
  ];

  const passRes = [
    {
      expiredAt: new Date('2023-10-15 23:59:59.999'),
      orderId: 'orderId1',
      passCount: 2,
      reservedFor: new Date('10-10-2023'),
      stageId: 'stageId',
      userId: 'userId',
      user: {
        id: 'userId',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        nationalityCode: 'FR',
        countryCode: '+33',
        contactNumber: '123456789',
        passportNumber: '78TH67841',
        nicNumber: '950370201V',
        dateOfBirth: new Date('2000-08-08T00:00:00.000Z'),
        emailOtpId: null,
        emailVerified: false,
        emailOtpSentAt: null,
        passwordResetOtpId: null,
        isGoogle: false,
        isFacebook: false,
        isApple: false,
        preferredLocaleId: 'en',
        registrationStatus: 'PENDING_VERIFICATION',
        createdAt: new Date('2023-09-18T05:29:05.407Z'),
        updatedAt: new Date('2023-09-21T15:34:45.940Z'),
        loginAt: new Date('2023-09-21T15:34:45.939Z'),
        role_id: 1,
        profileImageKey: null,
        deletedAt: null,
      },
    },
  ];

  const orderRes = {
    id: '192678ff-6f2c-4268-ac3c-7d34799bdf02',
    userId: '5e5fcf1d-5d32-4066-9fcd-f46860ef56c0',
    stageId: '192678ff-6f2c-4268-ac3c-7d34799bdf72',
    reservedFor: new Date('2023-10-15T00:00:00.000Z'),
    isRescheduled: false,
    createdAt: new Date('2023-10-15T00:00:00.000Z'),
    updatedAt: new Date('2023-10-15T00:00:00.000Z'),
  };

  const stageSummaryReportResponse: StageSummaryReportResponseDto = {
    data: [
      {
        id: '2a378246-6a70-43d7-aee8-75175f7b57a4',
        stageNumber: 1,
        stageName: 'Hanthana/ galaha',
        inventoryQuantity: 100,
        passQuantity: 50,
        remainingQuantity: 50,
      },
    ],
    summary: {
      totalInventoryQuantityForDay: 100,
      totalPassQuantityForDay: 50,
      totalRemainingQuantityForDay: 50,
    },
  };

  const closedStagesReportResponse: ClosedStagesDto[] = [
    {
      stageId: '2a378246-6a70-43d7-aee8-75175f7b57a4',
      stageNumber: 1,
      stageHead: 'Hanthana',
      stageTail: 'galaha',
      closeReason: 'test reason',
      closedDate: '2023-10-05',
    },
    {
      stageId: '2a378246-6a70-43d7-aee8-75175f7b57a4',
      stageNumber: 1,
      stageHead: 'Hanthana',
      stageTail: 'galaha',
      closeReason: 'test reason',
      closedDate: '2023-10-08',
    },
  ];

  const mockPrismaService = {
    reports: {
      getStageWiseSummaryReport: jest.fn(),
      getStageSummaryReport: jest.fn(),
      getCancelledPassesReport: jest.fn(),
      getClosedStagesReport: jest.fn(),
    },
    passOrdersAggregateView: {
      findMany: jest.fn(),
    },
    orders: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn().mockReturnValue(stageSummaryReportResponse.data),
    $queryRaw2: jest.fn().mockReturnValue(closedStagesReportResponse),
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
      providers: [
        ReportService,
        ReportRepository,
        PassesService,
        PrismaService,
        { provide: PrismaService, useValue: mockPrismaService },
        ExportToExcelService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);

    const reportSummary = jest.spyOn(mockPrismaService.reports, 'getStageWiseSummaryReport');
    const passes = jest.spyOn(mockPrismaService.passOrdersAggregateView, 'findMany');
    const orders = jest.spyOn(mockPrismaService.orders, 'findUnique');
    const cancelledPassesReport = jest.spyOn(mockPrismaService.reports, 'getCancelledPassesReport');
    const closedStagesReport = jest.spyOn(mockPrismaService.reports, 'getClosedStagesReport');

    reportSummary.mockResolvedValue(res);
    passes.mockResolvedValue(passRes);
    orders.mockResolvedValue(orderRes);
    cancelledPassesReport.mockResolvedValue(cancelledPassesResponse);
    closedStagesReport.mockResolvedValue(closedStagesReportResponse);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get the stage wise summary report', async () => {
    const response = await service.getStageWiseSummaryReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should get the downloadable stage wise summary report', async () => {
    mockPrismaService.$queryRaw.mockReturnValue(res);
    const response = await service.getDownloadableStageWiseSummaryReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    expect(response.end).toBeTruthy();
  });

  it('should get the stage summary with passes', async () => {
    mockPrismaService.$queryRaw.mockReturnValue(stageSummaryReportResponse.data);
    const response = await service.getStageSummaryReport('2023-10-01', '2023-10-02');

    expect(response).toMatchObject(stageSummaryReportResponse);
  });

  it('should return excel file as stream with all stage summary passes', async () => {
    mockPrismaService.$queryRaw.mockReturnValue(stageSummaryReportResponse.data);
    const response = await service.getStageSummaryReportDownload('2023-10-01', '2023-10-02');

    expect(response.end).toBeTruthy();
  });

  it('should get the cancelled passes report', async () => {
    const response = await service.getCancelledPassesReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should get the downloadable cancelled passes report', async () => {
    mockPrismaService.$queryRaw.mockReturnValue(cancelledPassesResponse);
    const response = await service.getDownloadableCancelledPassesReport(
      queryParams.stageId,
      queryParams.reservedFor,
    );

    expect(response.end).toBeTruthy();
  });

  it('should get the closed stages summary', async () => {
    const response = await service.getClosedStagesReport(
      queryParams.ClosedStartDate,
      queryParams.ClosedEndDate,
    );

    expect(Array.isArray(response)).toBeTruthy();
  });

  it('should get the downloadable closed stages summary report', async () => {
    mockPrismaService.$queryRaw2.mockReturnValue(closedStagesReportResponse);
    const response = await service.getClosedStagesReportDownload(
      queryParams.ClosedStartDate,
      queryParams.ClosedEndDate,
    );

    expect(response.end).toBeTruthy();
  });

  it('should handle errors when fetching closed stages report', async () => {
    const startDate = '2023-10-01';
    const endDate = '2023-10-25';

    mockPrismaService.$queryRaw = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(service.getClosedStagesReport(startDate, endDate)).rejects.toThrowError(
      new InternalServerErrorException('Something went wrong while fetching the request'),
    );
  });
});
