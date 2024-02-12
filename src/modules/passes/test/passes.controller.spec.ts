import {
  DATE_FORMATS,
  PASS_USER_TYPE,
  PASS_USER_TYPE_CODE,
  PASS_VALIDITY_PERIOD,
  PLATFORM,
  PassType,
  QUEUES,
} from '@common/constants';
import { AppConfig } from '@config/app-config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import moment from 'moment';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { MailService } from '../../../modules/mail/mail.service';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { DeletePassParamDto, GetPassDto, UserPassParamDto } from '../dto';
import { AmendPassParamsDto } from '../dto/request/amend-pass-params.dto';
import { AmendPassRequestBodyDto } from '../dto/request/amend-pass-request-body.dto';
import { GetUserActivePassParamDto } from '../dto/request/passes-stage-params.dto';
import { TransferPassBodyDto } from '../dto/request/transfer-pass-body.dto';
import { TransferPassParamDto } from '../dto/request/transfer-pass-params.dto';
import { PassesController } from '../passes.controller';
import { PassesService } from '../passes.service';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('PassesController', () => {
  let controller: PassesController;
  let service: PassesService;

  const mockService = {
    findAllByUser: jest.fn(),
    findAllPassesByUser: jest.fn(),
    getMyTrails: jest.fn(),
    getScheduledTrails: jest.fn(),
    getPastTrail: jest.fn(),
    getUserActivePassByStageId: jest.fn(),
    softDeletePass: jest.fn(),
    transferPass: jest.fn(),
    amendPass: jest.fn(),
  };

  const authUser = {
    sub: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const mockGetPassDto: GetPassDto = {
    perPage: 10,
    pageNumber: 1,
    type: PassType.EXPIRED,
  };

  const mockUserParamsDto: UserPassParamDto = {
    userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const mockDeleteParamsDto: DeletePassParamDto = {
    id: '0d23665f-07e8-4d94-ab2d-92b58999c55e',
  };

  const mockTransferPassParamsDto: TransferPassParamDto = {
    id: '0d23665f-07e8-4d94-ab2d-92b58999c55e',
  };

  const amendPassRequestBody: AmendPassRequestBodyDto = {
    date: new Date(),
    stageId: '0d23665f-07e8-4d94-ab2d-92b58999c55e',
  };

  const amendPassReqParams: AmendPassParamsDto = {
    orderId: '0d23665f-07e8-4d94-ab2d-92b58999c55e',
  };

  const mockTransferPassBodyDto: TransferPassBodyDto = {
    userId: '3eb75a22-cfef-4596-b51e-a709712d13ac',
  };

  const mockActivePassParamsDto: GetUserActivePassParamDto = {
    stageId: '0d23665f-07e8-4d94-ab2d-92b58999c55e',
  };

  const mockHeadersDto = {
    headers: {
      platform: PLATFORM.mobile,
    },
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
      controllers: [PassesController],
      providers: [
        PassesService,
        PrismaService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        ConfigService,
        { provide: PassesService, useValue: mockService },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        StaticContentService,
        StaticContentRepository,
        UserService,
        UserRepository,
        KeycloakService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    controller = module.get<PassesController>(PassesController);
    service = module.get<PassesService>(PassesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Find all passes for a user mobile endpoint', () => {
    it('the controller method should have been called with the correct parameters', async () => {
      const getAllByUserSpy = jest.spyOn(controller, 'findAllByUser');
      await controller.findAllByUser(mockGetPassDto, authUser, mockHeadersDto);

      expect(getAllByUserSpy).toHaveBeenCalledWith(mockGetPassDto, authUser, mockHeadersDto);
    });

    it('the controller should return all the passes by user', async () => {
      const mockRes = {
        data: [
          {
            orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
            userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
            stageId: '37114663-211d-4c35-a105-5ab61ed5285c',
            reservedFor: '2023-08-21T00:00:00.000Z',
            passCount: 2,
            status: PassType.EXPIRED,
            stageData: {
              passes: [
                {
                  id: '9af558ce-7979-441a-a990-7a920345a59c',
                },
                {
                  id: '36e4a360-0e50-477e-bd05-17db23d4ad68',
                },
              ],
              distance: 10,
              estimatedDuration: 330,
              number: 2,
              difficultyType: 'BEGINNER',
              openTime: '1970-01-01T02:30:00.000Z',
              closeTime: '1970-01-01T06:30:00.000Z',
              elevationGain: 0,
              stagesTranslation: [
                {
                  stageHead: 'Galaha',
                  stageTail: 'Loolecondera',
                  localeId: 'en',
                },
                {
                  stageHead: 'Galaha',
                  stageTail: 'Loolecondera',
                  localeId: 'fr',
                },
              ],
            },
          },
        ],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      mockService.findAllByUser.mockReturnValueOnce(mockRes);
      const responseFromController = await controller.findAllByUser(
        mockGetPassDto,
        authUser,
        mockHeadersDto,
      );
      expect(responseFromController).toMatchObject({ data: mockRes });
    });
  });

  describe('Find all passes for a user admin endpoint', () => {
    it('the controller method should have been called with the correct parameters', async () => {
      const getAllByUserSpy = jest.spyOn(controller, 'findAllPassesByUser');
      await controller.findAllPassesByUser(mockUserParamsDto, mockGetPassDto, mockHeadersDto);

      expect(getAllByUserSpy).toHaveBeenCalledWith(
        mockUserParamsDto,
        mockGetPassDto,
        mockHeadersDto,
      );
    });

    it('the controller should return all the passes for a user when admin requests', async () => {
      const mockRes = {
        data: [
          {
            orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
            userId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
            stageId: '37114663-211d-4c35-a105-5ab61ed5285c',
            reservedFor: '2023-08-21T00:00:00.000Z',
            passCount: 2,
            status: PassType.EXPIRED,
          },
        ],
        meta: {
          total: 3,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      jest.spyOn(service, 'findAllByUser').mockImplementation(async () => mockRes);
      expect(
        await controller.findAllPassesByUser(mockUserParamsDto, mockGetPassDto, mockHeadersDto),
      ).toMatchObject({ data: mockRes });
    });
  });

  describe('Get users trails', () => {
    it('the controller method should be called with correct parameters', async () => {
      const findMyTrails = jest.spyOn(controller, 'findAllUserTrails');
      await controller.findAllUserTrails(mockGetPassDto, mockUserParamsDto);
      expect(findMyTrails).toHaveBeenCalledWith(mockGetPassDto, mockUserParamsDto);
    });
  });

  describe('Get active pass of a user by stage', () => {
    it('the controller method should be called with correct parameters', async () => {
      const findUserActiveTrail = jest.spyOn(controller, 'getUserActivePassByStageId');
      await controller.getUserActivePassByStageId(mockActivePassParamsDto, mockUserParamsDto);
      expect(findUserActiveTrail).toHaveBeenCalledWith(mockActivePassParamsDto, mockUserParamsDto);
    });

    it('the controller should return active pass of a user by stage', async () => {
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: true,
        isTransferred: true,
        reservedFor: moment(moment().format(DATE_FORMATS.YYYYMMDD)).toDate(),
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
        expiredAt: moment().endOf('day').toDate(),
        passValidityPeriod: PASS_VALIDITY_PERIOD,
      };

      jest.spyOn(service, 'getUserActivePassByStageId').mockImplementation(async () => mockRes);
      expect(
        await controller.getUserActivePassByStageId(mockActivePassParamsDto, mockUserParamsDto),
      ).toMatchObject({ data: mockRes });
    });
  });

  describe('Delete pass for a mobile user endpoint', () => {
    it('the controller method should have been called with the correct parameters', async () => {
      const deletePassById = jest.spyOn(controller, 'deletePassById');
      await controller.deletePassById(mockDeleteParamsDto, mockUserParamsDto);

      expect(deletePassById).toHaveBeenCalledWith(mockDeleteParamsDto, mockUserParamsDto);
    });

    it('the controller should return deleted pass', async () => {
      const mockRes = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: true,
          isTransferred: true,
          reservedFor: moment(moment().format(DATE_FORMATS.YYYYMMDD)).toDate(),
          isCancelled: true,
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          expiredAt: moment().endOf('day').toDate(),
          cancelledAt: new Date(),
        },
      ];

      jest.spyOn(service, 'softDeletePass').mockImplementation(async () => mockRes);
      expect(await controller.deletePassById(mockDeleteParamsDto, mockUserParamsDto)).toMatchObject(
        { data: mockRes },
      );
    });
  });

  describe('Transfer pass endpoint', () => {
    it('the controller method should have been called with the correct parameters', async () => {
      const transferPassById = jest.spyOn(controller, 'transferPassById');
      await controller.transferPassById(mockTransferPassParamsDto, authUser);

      expect(transferPassById).toHaveBeenCalledWith(mockTransferPassParamsDto, authUser);
    });

    it('the controller should return transferred pass', async () => {
      const mockRes = {
        id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
        userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
        orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
        activated: true,
        isTransferred: true,
        reservedFor: moment(moment().format(DATE_FORMATS.YYYYMMDD)).toDate(),
        isCancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
        expiredAt: moment().endOf('day').toDate(),
      };

      jest.spyOn(service, 'transferPass').mockImplementation(async () => mockRes);
      expect(await controller.transferPassById(mockTransferPassParamsDto, authUser)).toMatchObject({
        data: mockRes,
      });
    });

    it('should amned a pass for a given date and stage', async () => {
      const mockRes = [
        {
          id: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          stageId: 'd55e373f-f86d-4f2d-996e-2a576cd0ce9f',
          userId: '56ecf2ce-6a5b-4771-8d5c-03d23b17c604',
          orderId: '45fe6a62-c4fc-4415-b5b8-55c4c5b4507f',
          activated: true,
          isTransferred: true,
          reservedFor: new Date(),
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          expiredAt: new Date(),
          cancelledAt: null,
          passId: 1234,
        },
      ];

      jest.spyOn(service, 'amendPass').mockImplementation(async () => mockRes);
      expect(
        await controller.amendPass(
          amendPassRequestBody,
          amendPassReqParams,
          mockTransferPassBodyDto,
        ),
      ).toMatchObject({ data: mockRes });
    });
  });
});
