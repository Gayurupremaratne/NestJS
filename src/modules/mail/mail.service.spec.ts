import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { MailResponse } from './interfaces/mail.interface';

jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockImplementation(() => {
      return {
        sendMail: jest.fn().mockResolvedValueOnce({ response: 'OK' }),
      };
    }),
  };
});

describe('MailService', () => {
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({ DOMAIN: 'test.com' }),
          },
        },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(mailService).toBeDefined();
  });

  const mailData = {
    templateName: 'verify-email',
    templateVars: {
      code: '1234',
      email: 'devops@test.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const emailOption = {
    to: 'devops@test.com',
    subject: 'test',
  };

  it('should send email', async () => {
    const result: MailResponse = await mailService.sendMail(emailOption, mailData);
    expect(result.response).toBe('OK');
  });
});
