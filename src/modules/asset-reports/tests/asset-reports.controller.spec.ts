import { QUEUES } from '@common/constants';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { $Enums } from '@prisma/client';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { AuthGuard } from '../../casl/authorization-guard';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { MailService } from '../../mail/mail.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { OrderRepository } from '../../order/order.repository';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { UserRepository } from '../../user/user.repository';
import { AssetReportsController } from '../asset-reports.controller';
import { AssetReportsService } from '../asset-reports.service';
import { RemoveorResolveReportAssetDto } from '../dto/remove-or-resolve-report-asset.dto';
import { ReportAssetDto } from '../dto/report-asset.dto';
import { RequestQueryParamsDto } from '../dto/request-query-params.dto';
import { RequestReportedUsersDto } from '../dto/request-reported-users.dto';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { PushNotificationService } from '../../push-notification/push-notification.service';

describe('AssetReportsController', () => {
  let controller: AssetReportsController;
  const mockService = {
    removeAsset: jest.fn(),
    findAll: jest.fn(),
    reportAsset: jest.fn(),
    resolveAsset: jest.fn(),
    getReportedUsersByAsset: jest.fn(),
  };

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockNoticeQueuePublisher = {
    publishToNoticeQueue: jest.fn(),
  };

  const mockPushNotificationService = {
    sendBatchedNotifications: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [AssetReportsController],
      providers: [
        NoticeService,
        NoticeRepository,
        AssetReportsService,
        PrismaService,
        UserService,
        UserRepository,
        KeycloakService,
        PassesService,
        StaticContentService,
        StaticContentRepository,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        StageService,
        StageRepository,
        { provide: AssetReportsService, useValue: mockService },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    controller = module.get<AssetReportsController>(AssetReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return an array of asset reports', async () => {
    const requestParams: RequestQueryParamsDto = {
      perPage: 1,
      pageNumber: 1,
      status: 'PENDING',
    };
    const responseResult = await controller.findAllReportAssets(requestParams);

    expect(responseResult).toBeDefined();
  });

  it('should get all the reported users of an asset report', async () => {
    const requestParams: RequestReportedUsersDto = {
      pageNumber: 1,
      perPage: 10,
      reportId: 'reportId',
    };
    const responseResult = await controller.getReportedUsersByAsset(requestParams);

    expect(responseResult).toBeDefined();
  });

  it('should change an asset status', async () => {
    const mockRequest: RemoveorResolveReportAssetDto = {
      fileKey: 'fileKey',
      status: $Enums.FILE_REPORT_STATUS.RESOLVED,
    };
    const responseResult = await controller.changeStatus(mockRequest);

    expect(responseResult).toBeDefined();
  });

  it('should report an asset', async () => {
    const mockRequest: ReportAssetDto = {
      fileKey: 'fileKey',
      comment: 'reason',
      id: '',
      status: 'PENDING',
      userId: '',
      updatedAt: undefined,
    };
    const responseResult = await controller.reportAsset(mockRequest, {
      sub: 'sub',
    });

    expect(responseResult).toBeDefined();
  });
});
