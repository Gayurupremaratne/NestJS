import { QUEUES, REGISTRATION_STATUS, STATIC_CONTENT_PATHS, STATUS_CODE } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { getQueueToken } from '@nestjs/bull';
import { HttpException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { AssetReport } from '@prisma/client';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserService } from '@user/user.service';
import axios, { AxiosInstance } from 'axios';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../../../modules/keycloak/keycloak.service';
import { StaticContentController } from '../../../modules/static-content/static-content.controller';
import { StaticContentRepository } from '../../../modules/static-content/static-content.repository';
import { StaticContentService } from '../../../modules/static-content/static-content.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { FcmTokensService } from '../../fcm-tokens/fcm-tokens.service';
import { MailService } from '../../mail/mail.service';
import { NoticeRepository } from '../../notice/notice.repository';
import { NoticeService } from '../../notice/notice.service';
import { OrderRepository } from '../../order/order.repository';
import { PassInventoryService } from '../../pass-inventory/pass-inventory.service';
import { PassesService } from '../../passes/passes.service';
import { StageRepository } from '../../stage/stage.repository';
import { StageService } from '../../stage/stage.service';
import { UserDto } from '../../user/dto/user.dto';
import { UserRepository } from '../../user/user.repository';
import { AssetReportsService } from '../asset-reports.service';
import { ReportAssetDto } from '../dto/report-asset.dto';
import { RequestReportedUsersDto } from '../dto/request-reported-users.dto';
import { NoticeQueuePublisher } from '../../notice/queue/notice.publisher';
import { PushNotificationService } from '../../push-notification/push-notification.service';

describe('AssetReportsService', () => {
  let service: AssetReportsService;
  const mediaFileName = `${uuidv4()}.jpeg`;
  const fileBuffer = Buffer.from('Your file content goes here', 'utf-8');
  let staticContentController: StaticContentController;
  let userService: UserService;
  let user: UserDto;
  let s3AxiosInstance: AxiosInstance;
  let uploadedFileName = null;
  let createdReport: AssetReport;

  const userId = uuidv4();
  const userRequest = {
    id: userId,
    firstName: 'test',
    lastName: 'test',
    email: `test${userId}@gmail.com`,
    nationalityCode: 'FR',
    countryCode: '+33',
    contactNumber: '123456789',
    passportNumber: '78TH67845',
    nicNumber: '950370203V',
    dateOfBirth: '2000-08-08',
    preferredLocaleId: 'en',
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  const getSignedUrlRequestForStory = {
    fileName: mediaFileName,
    module: STATIC_CONTENT_PATHS.TRAIL_MEDIA,
    fileSize: fileBuffer.length,
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
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
      controllers: [StaticContentController],
      providers: [
        NoticeRepository,
        NoticeService,
        StageService,
        StageRepository,
        AssetReportsService,
        PrismaService,
        StaticContentService,
        StaticContentRepository,
        UserService,
        PassesService,
        OrderRepository,
        PassInventoryService,
        FcmTokensService,
        UserRepository,
        KeycloakService,
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        { provide: MailService, useValue: mockMailService },
        { provide: NoticeQueuePublisher, useValue: mockNoticeQueuePublisher },
        { provide: PushNotificationService, useValue: mockPushNotificationService },
      ],
    }).compile();

    service = module.get<AssetReportsService>(AssetReportsService);
    staticContentController = module.get<StaticContentController>(StaticContentController);
    userService = module.get<UserService>(UserService);
    s3AxiosInstance = axios.create();

    const signedUrl = await staticContentController.getSignedUrlForStaticMedia(
      getSignedUrlRequestForStory,
    );

    uploadedFileName = signedUrl.uniqueFileName;

    await s3AxiosInstance.put(signedUrl.s3Url, fileBuffer);

    const userResponse = await userService.createUser(userRequest);
    user = userResponse;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an asset report', async () => {
    const mockRequest: ReportAssetDto = {
      fileKey: `${STATIC_CONTENT_PATHS.TRAIL_MEDIA}/${uploadedFileName}`,
      comment: 'reason',
      id: '',
      status: 'PENDING',
      userId: '',
      updatedAt: undefined,
    };
    const responseResult = await service.reportAsset(mockRequest, user.id);

    createdReport = responseResult;

    expect(responseResult).toBeDefined();
  });

  it('should find all asset reports', async () => {
    const responseResult = await service.findAll(1, 1, 'PENDING', 'updatedAt');

    expect(responseResult).toBeDefined();
  });

  it('should resolve an asset', async () => {
    const mockRequest = {
      fileKey: `${STATIC_CONTENT_PATHS.TRAIL_MEDIA}/${uploadedFileName}`,
    };
    const responseResult = await service.resolveAsset(mockRequest.fileKey);

    expect(responseResult).toBeDefined();
  });

  it('should throw an error when the fileKey is duplicated', async () => {
    try {
      const mockRequest: ReportAssetDto = {
        fileKey: `${STATIC_CONTENT_PATHS.TRAIL_MEDIA}/${uploadedFileName}`,
        comment: 'reason',
        id: '',
        status: 'PENDING',
        userId: '',
        updatedAt: undefined,
      };
      await service.reportAsset(mockRequest, user.id);
      await service.reportAsset(mockRequest, user.id);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(HttpException);
    }
  });

  it('should remove an asset', async () => {
    const mockRequest = {
      fileKey: `${STATIC_CONTENT_PATHS.TRAIL_MEDIA}/${uploadedFileName}`,
    };
    const responseResult = await service.removeAsset(mockRequest.fileKey);

    expect(responseResult).toBeDefined();
  });

  it('should throw an error when asset is not found', async () => {
    const mockRequest = {
      fileKey: `${STATIC_CONTENT_PATHS.OTHERS}/${uploadedFileName}`,
    };
    try {
      await service.removeAsset(mockRequest.fileKey);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should get all the reported users of an asset report', async () => {
    const requestParams: RequestReportedUsersDto = {
      pageNumber: 1,
      perPage: 10,
      reportId: createdReport.id,
      sortBy: 'updatedAt',
    };
    const responseResult = await service.getReportedUsersByAsset(
      requestParams.pageNumber,
      requestParams.perPage,
      requestParams.reportId,
      requestParams.sortBy,
    );

    expect(responseResult).toBeDefined();
  });

  it('should get all the reported users of an asset report', async () => {
    const requestParams: RequestReportedUsersDto = {
      pageNumber: 1,
      perPage: 10,
      reportId: 'reportId',
      sortBy: 'updatedAt',
    };
    try {
      await service.getReportedUsersByAsset(
        requestParams.pageNumber,
        requestParams.perPage,
        requestParams.reportId,
        requestParams.sortBy,
      );
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should throw an error when forign key constraint fails on create report', async () => {
    try {
      const mockRequest: ReportAssetDto = {
        fileKey: `${STATIC_CONTENT_PATHS.OTHERS}/${uploadedFileName}`,
        comment: 'reason',
        id: '',
        status: 'PENDING',
        userId: '',
        updatedAt: undefined,
      };
      await service.reportAsset(mockRequest, user.id);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should throw an error when the fileKey is wrong when changing the status to RESOLVED', async () => {
    try {
      const mockRequest = {
        fileKey: `${STATIC_CONTENT_PATHS.OTHERS}/${uploadedFileName}`,
      };
      await service.resolveAsset(mockRequest.fileKey);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should throw an error when getting all reports with invalied status', async () => {
    try {
      await service.findAll(1, 1, 'INVALID', 'updatedAt');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
