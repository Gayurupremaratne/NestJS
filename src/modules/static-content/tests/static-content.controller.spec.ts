import { Test, TestingModule } from '@nestjs/testing';
import { StaticContentController } from '../static-content.controller';
import { StaticContentService } from '../static-content.service';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from '@config/app-config';
import { StaticContentRepository } from '../static-content.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('StaticContentController', () => {
  let controller: StaticContentController;

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
      controllers: [StaticContentController],
      providers: [
        StaticContentService,
        StaticContentRepository,
        PrismaService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    controller = module.get<StaticContentController>(StaticContentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a signed url', async () => {
    const reqBody = {
      fileName: 'test.png',
      filePath: 'test',
      module: 'test',
      fileSize: 1000,
    };

    const signedUrl = await controller.getSignedUrlForStaticMedia(reqBody);

    expect(signedUrl).toBeDefined();
    expect(signedUrl).toHaveProperty('s3Url');
    expect(signedUrl).toHaveProperty('filePath');
    expect(signedUrl).toHaveProperty('uniqueFileName');
  });
});
