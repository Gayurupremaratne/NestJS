import { FORGOT_PASSWORD_ACTIVE_PERIOD } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAbilitiesGuard } from '../../common/mock-modules/abilities.guard.mock';
import { AuthService } from '../auth/auth.service';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { StaticContentService } from '../static-content/static-content.service';
import { ForgotPasswordController } from './forgot-password.controller';
import { ForgotPasswordService } from './forgot-password.service';

describe('ForgotPasswordController', () => {
  let controller: ForgotPasswordController;
  let service: ForgotPasswordService;
  const mockUserEmail = `test${uuidv4()}@gmail.com`;
  let mockAbilitiesGuard: AbilitiesGuard;

  let app: INestApplication;

  const mockKeycloakService = {
    resetPassword: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [ForgotPasswordController],
      providers: [
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        UserRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        ForgotPasswordService,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    controller = moduleRef.get(ForgotPasswordController);
    mockAbilitiesGuard = moduleRef.get<AbilitiesGuard>(AbilitiesGuard);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);

    service = moduleRef.get(ForgotPasswordService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Send Password Otp Email', () => {
    it('should send password otp email successfully', async () => {
      jest.spyOn(service, 'forgotPassword').mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/forgot-password')
        .set('Content-Type', 'application/json')
        .send({ email: mockUserEmail });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('Verify Password Otp Email', () => {
    it('should verify password otp successfully', async () => {
      jest.spyOn(service, 'verifyRecoveryCode').mockResolvedValue({
        verified: true,
        expirationData: {
          emailOtpSentAt: new Date(),
          emailOtpExpiresAt: new Date(Date.now() + FORGOT_PASSWORD_ACTIVE_PERIOD * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post('/recovery-code')
        .set('Content-Type', 'application/json')
        .send({ email: mockUserEmail, code: '1234' });

      const formattedResponse = response.body.data as { verified: boolean };

      expect(formattedResponse.verified).toBeTruthy();
      expect(response.statusCode).toBe(201);
    });
  });

  describe('Reset Password', () => {
    it('should verify password otp successfully', async () => {
      const mockUser = {
        email: mockUserEmail,
      };
      jest.spyOn(service, 'resetPassword').mockResolvedValue(mockUser as unknown as UserDto);

      const response = await request(app.getHttpServer())
        .post('/reset-password')
        .set('Content-Type', 'application/json')
        .send({ email: mockUserEmail, code: '1234', newPassword: 'Updated@123' });

      expect(response.statusCode).toBe(201);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
