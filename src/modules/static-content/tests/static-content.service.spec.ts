import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { StaticContentRepository } from '../static-content.repository';
import { StaticContentService } from '../static-content.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StaticContentService', () => {
  let service: StaticContentService;

  const mockStaticContentRepository = {
    createAssetEntry: jest.fn(),
    deleteAssetEntry: jest.fn(),
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
        {
          provide: StaticContentRepository,
          useValue: mockStaticContentRepository,
        },
        StaticContentService,
        PrismaService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    service = module.get<StaticContentService>(StaticContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('should return a signed url', () => {
    it.each([
      ['test'],
      ['trail-media'],
      ['promotion-media'],
      ['profile-media'],
      ['story-media'],
      ['poi-media'],
      ['kml-stage-media'],
      ['kml-other-media'],
    ])("when the input is '%s'", async (module) => {
      const reqBody = {
        fileName: 'test.png',
        filePath: 'test',
        module,
        fileSize: 1000,
      };

      const signedUrl = await service.getSignedUrlForStaticMedia(reqBody);

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toHaveProperty('s3Url');
      expect(signedUrl).toHaveProperty('filePath');
      expect(signedUrl).toHaveProperty('uniqueFileName');
    });
  });

  it('should throw exception for invalid asset keys', () => {
    try {
      service.deleteAssetKeys(uuidv4());
    } catch (error) {
      expect(error.response.message).toBe('Internal Server Error');
      expect(error.status).toBe(500);
    }
  });

  it('should throw exception when passing invalid keys s3 delete objects', () => {
    try {
      service.s3DeleteObjects([uuidv4()]);
    } catch (error) {
      expect(error.response.message).toBe('Internal Server Error');
      expect(error.status).toBe(500);
    }
  });
});
