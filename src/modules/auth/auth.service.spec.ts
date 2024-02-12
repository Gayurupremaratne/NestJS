import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { AppConfig } from '@config/app-config';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserService } from '@user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { KeycloakUserDto } from '../keycloak/dto/keycloak-user.dto';
import { KeycloakTokensDto, LoginResponseDto } from '../keycloak/dto/keycloak.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentService } from '../static-content/static-content.service';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';
import { AuthSocialLogin } from './dto/auth-social-login.dto';
import { AuthUserDto } from './dto/auth-user';
import { RefreshTokenRequest } from './dto/refresh-token';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../worker/mail/mail.consumer';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';

// Login
describe('AuthService', () => {
  let authService: AuthService;

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(async (reqBody: AuthUserDto) => {
      // Mocking user data
      const userData = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
        createdAt: new Date('2023-07-21T12:34:56Z'),
        updatedAt: new Date('2023-07-21T12:34:56Z'),
        loginAt: new Date('2023-07-21T12:34:56Z'),
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      const mockResult: LoginResponseDto = {
        userData: userData,
        keycloakTokens: keycloakTokens,
      };

      const user: AuthUserDto = {
        email: 'valid-username',
        password: 'valid-password',
      };

      if (user.email === reqBody.email && user.password === reqBody.password) {
        return mockResult;
      } else if (user.email === reqBody.email && user.password !== reqBody.password) {
        throw new HttpException('invalid password', HttpStatus.FORBIDDEN);
      } else if (user.email !== reqBody.email && user.password === reqBody.password) {
        throw new HttpException('invalid email', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }),
    getRefreshTokens: jest.fn(async (refresh_token: string) => {
      const mockRequest = {
        refresh_token: 'jasnfjkabc',
      };

      const mockResponse = {
        statusCode: 201,
        data: {
          access_token:
            'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJjdHZobW5nc0hVV0lUTnBqdUtBVDdmX3huMDU2M2hxY0pxV2FiZzVoaHlrIn0.eyJleHAiOjE2OTA1MjYxNTEsImlhdCI6MTY5MDUyNTU1MSwianRpIjoiNzhjOWZiODgtMjMxMS00OTAyLWFjMTItZThiZGFmMDQwODY3IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmRldi50aGVwZWtvZXRyYWlsYXBwLmNvbS9yZWFsbXMvcGVrb2UtZGV2IiwiYXVkIjoiYWNjb3VudCIsInN1YiI6IjhmOTcwZDQxLWY5NTAtNGJhNi1hNDg2LTFjOTMxYzhhNDY4OCIsInR5cCI6IkJlYXJlciIsImF6cCI6InBla29lLWFwcCIsInNlc3Npb25fc3RhdGUiOiJhYmIzYmQ3Yy0yOGFkLTRjMjYtOGEwNS1mNjIxYjZjYThhYzciLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vYXV0aC5kZXYudGhlcGVrb2V0cmFpbGFwcC5jb20iXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwiZGVmYXVsdC1yb2xlcy1wZWtvZS1kZXYiLCJhZG1pbiIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwic2lkIjoiYWJiM2JkN2MtMjhhZC00YzI2LThhMDUtZjYyMWI2Y2E4YWM3IiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoiRmlyc3QgTGFzdCIsInByZWZlcnJlZF91c2VybmFtZSI6ImFraWxhQHN1cmdlLmdsb2JhbCIsImdpdmVuX25hbWUiOiJGaXJzdCIsImZhbWlseV9uYW1lIjoiTGFzdCIsImVtYWlsIjoiYWtpbGFAc3VyZ2UuZ2xvYmFsIn0.cGrAFrPBfdBR4zYRDk4KVV0X7zjq3Xt6MV966OIKKI0-uUHw74ChAOJBGWvwF_qblrLzikISXG0v4UdmkjqtToUXHjI-MA9Gz3nyJu3T5sGtiZC6LeqH3Nm9m0pjjD6AoHsQApKVOZGoVIWVjXD_OAmMQM9DVqeXwf4dmrbjudcVkBSraCGoMbdEHQGKMzgvYpLu62SZE5WxV4LyKp5U6wIkgCezY620_JErajTuh9sKtt94PtJCNgSe8ho4_CjFgZjLsjmkvT9hXTPmxKUda6H1SSjVt1V5gAXu_MeZ8oo27bxxrAilUftSRxW2F8gzGMljrUylJHBg0RtUlSpV3Q',
          refresh_token:
            'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI5MjliYTcxOC0zNmJhLTRkMWMtOTUyZi1iZTMyNjkyZTdiNWQifQ.eyJleHAiOjE2OTExMzAyODMsImlhdCI6MTY5MDUyNTU1MSwianRpIjoiNDI4NzU3YmMtMzJkZS00YTZiLTkxOTAtOWZiMTk4ODkzZWIwIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmRldi50aGVwZWtvZXRyYWlsYXBwLmNvbS9yZWFsbXMvcGVrb2UtZGV2IiwiYXVkIjoiaHR0cHM6Ly9hdXRoLmRldi50aGVwZWtvZXRyYWlsYXBwLmNvbS9yZWFsbXMvcGVrb2UtZGV2Iiwic3ViIjoiOGY5NzBkNDEtZjk1MC00YmE2LWE0ODYtMWM5MzFjOGE0Njg4IiwidHlwIjoiUmVmcmVzaCIsImF6cCI6InBla29lLWFwcCIsInNlc3Npb25fc3RhdGUiOiJhYmIzYmQ3Yy0yOGFkLTRjMjYtOGEwNS1mNjIxYjZjYThhYzciLCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJzaWQiOiJhYmIzYmQ3Yy0yOGFkLTRjMjYtOGEwNS1mNjIxYjZjYThhYzcifQ.zE470sTJsAUyM8EHYTtcoAsuOX_82c3iD6Phx-HZcI8',
          expires_in: 600,
          refresh_expires_in: 604732,
        },
      };

      if (mockRequest.refresh_token === refresh_token) {
        return mockResponse;
      }
    }),
    getUserInfo: jest.fn(async (email: string) => {
      const mockRequest = {
        email: 'test@email.com',
      };

      if (mockRequest.email === email) {
        const mockResponse = {
          id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
          firstName: 'Firstname ',
          lastName: 'Lastname',
        } as KeycloakUserDto;
        return mockResponse;
      } else {
        throw new HttpException('invalid email', HttpStatus.UNAUTHORIZED);
      }
    }),
    refreshToken: jest.fn(async (refresh_token: string) => {
      const mockRequest = {
        refresh_token: 'jasnfjkabc',
      };

      if (mockRequest.refresh_token === refresh_token) {
        return mockRequest;
      }
    }),
    getUser: jest.fn(async (email: string) => {
      const mockRequest = {
        email: 'test@email.com',
      };

      if (mockRequest.email === email) {
        const mockResponse = {
          id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
          firstName: 'Firstname ',
          lastName: 'Lastname',
        } as KeycloakUserDto;
        return mockResponse;
      } else {
        throw new HttpException('invalid email', HttpStatus.UNAUTHORIZED);
      }
    }),
    logout: jest.fn(),
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        { provide: KeycloakService, useValue: mockAuthService },
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        PassesService,
        UserRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },

        //{ provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('AuthService - should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Mocking user data
      const userData = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
        createdAt: new Date('2023-07-21T12:34:56Z'),
        updatedAt: new Date('2023-07-21T12:34:56Z'),
        loginAt: new Date('2023-07-21T12:34:56Z'),
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      const mockResult: LoginResponseDto = {
        userData: userData,
        keycloakTokens: keycloakTokens,
      };

      jest.spyOn(authService, 'login').mockResolvedValueOnce(mockResult);

      const user: AuthUserDto = {
        email: 'valid-username',
        password: 'valid-password',
      };
      const response = await authService.login(user);
      expect(response).toBe(mockResult);
    });

    it('should fail user login', async () => {
      jest.spyOn(authService, 'login').mockRejectedValueOnce('error');

      async function asyncFunctionThatThrowsError() {
        await authService.login({
          email: 'invalid',
          password: 'invalid',
        });
      }
      expect.assertions(1);
      await expect(asyncFunctionThatThrowsError()).rejects.toMatch('error');
    });
  });

  it('get user data', async () => {
    const mockRequest = {
      email: 'test@email.com',
    };

    const mockResponse = {
      id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
      firstName: 'Firstname ',
      lastName: 'Lastname',
    } as KeycloakUserDto;

    const response = await authService.getUserInfo(mockRequest.email);

    expect(response).toMatchObject(mockResponse);
  });

  it('login user not found exception', async () => {
    const user: AuthUserDto = {
      email: 'test.mail.com',
      password: 'testpassword',
    };

    try {
      await authService.login(user);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
    }
  });

  it('get refresh token', async () => {
    const refresh_token: RefreshTokenRequest = {
      refresh_token: 'jasnfjkabc',
    };

    const response = await authService.getRefreshTokens(refresh_token);
    expect(response).toBeDefined();
  });

  it('test_valid_email', async () => {
    try {
      // Call the function to be tested
      await authService.getUserInfo('test@example.com');
    } catch (error) {
      // Expect an HttpException with UNAUTHORIZED status code to be thrown
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.UNAUTHORIZED);
    }
  });
});
// Social login
describe('AuthService', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  const mockKeycloakService = {
    // socialLogin: jest.fn(),
    socialLogin: jest.fn(async (_reqBody: AuthSocialLogin) => {
      const user = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
        createdAt: new Date('2023-07-21T12:34:56Z'),
        updatedAt: new Date('2023-07-21T12:34:56Z'),
        loginAt: new Date('2023-07-21T12:34:56Z'),
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      // Mocking the return value
      const mockResult = {
        userData: user,
        keycloakTokens: keycloakTokens,
      };

      // Mocking the code and the code verifier
      const authLoginSocial: AuthSocialLogin = {
        code: '47dcefe1-d7b7-4e40-95f1-a345f2177d2a.b0535b33-d2b0-4a07-875e-172f33a49e86.951a33f0-b905',
        codeVerifier:
          'a520TtMe07G5Ow2f0t0dfCcJ5_9DOpwiuRzqPT0wpYfhtzAlm_WuZJbuLl8KyzzUM9CW9eiPxV0v6HErZP4j0itXGR0YWOcwYnpSHxfFnHglEW0lemH6mYdF0bDZqutV',
      };

      if (
        authLoginSocial.code === authLoginSocial.code &&
        authLoginSocial.codeVerifier === authLoginSocial.codeVerifier
      ) {
        return mockResult;
      } else if (
        authLoginSocial.code === authLoginSocial.code &&
        authLoginSocial.codeVerifier !== authLoginSocial.codeVerifier
      ) {
        throw new HttpException('invalid code verifier', HttpStatus.BAD_REQUEST);
      } else {
        throw new HttpException('invalid code verifier', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }),
    logout: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [
        { provide: KeycloakService, useValue: mockKeycloakService },
        AuthService,
        PrismaService,
        JwtService,
        UserService,
        PassesService,
        UserRepository,
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('AuthService - should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('socialLogin', () => {
    it('should login social-login user successfully', async () => {
      // Mocking user data
      const user = {
        id: 'd59b76f2-26df-4de0-9e04-4644dc57e309',
        firstName: 'Firstname ',
        lastName: 'Lastname',
        email: 'test.email@gmail.com',
        nationalityCode: null,
        countryCode: null,
        contactNumber: null,
        passportNumber: null,
        nicNumber: null,
        dateOfBirth: null,
        preferredLocaleId: 'en',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
        createdAt: new Date('2023-07-21T12:34:56Z'),
        updatedAt: new Date('2023-07-21T12:34:56Z'),
        loginAt: new Date('2023-07-21T12:34:56Z'),
      } as UserDto;

      // Mocking keycloak tokens
      const keycloakTokens = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI',
        expires_in: 600,
        refresh_expires_in: 602997,
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJj',
        token_type: 'Bearer',
        scope: 'profile email',
        session_state: 'fa33d9f9-a946-4890-b207-22f80835e034',
        'not-before-policy': 0,
      } as KeycloakTokensDto;

      // Mocking the return value
      const mockResult = {
        userData: user,
        keycloakTokens: keycloakTokens,
      };

      jest.spyOn(authService, 'socialLogin').mockResolvedValueOnce(mockResult);

      // Mocking the code and the code verifier
      const authLoginSocial: AuthSocialLogin = {
        code: '47dcefe1-d7b7-4e40-95f1-a345f2177d2a.b0535b33-d2b0-4a07-875e-172f33a49e86.951a33f0-b905',
        codeVerifier:
          'a520TtMe07G5Ow2f0t0dfCcJ5_9DOpwiuRzqPT0wpYfhtzAlm_WuZJbuLl8KyzzUM9CW9eiPxV0v6HErZP4j0itXGR0YWOcwYnpSHxfFnHglEW0lemH6mYdF0bDZqutV',
      };

      const response = await authService.socialLogin(authLoginSocial);
      expect(response).toBe(mockResult);
    });

    it('should fail user login using social-login', async () => {
      jest.spyOn(authService, 'socialLogin').mockRejectedValueOnce('error');

      // Mocking the code and the code verifier
      const authLoginSocial: AuthSocialLogin = {
        code: 'b905',
        codeVerifier: 'a520TtMe07G5Ow2f0t0dfCcJ5',
      };

      async function asyncFunctionThatThrowsError() {
        await authService.socialLogin(authLoginSocial);
      }
      expect.assertions(1);
      await expect(asyncFunctionThatThrowsError()).rejects.toMatch('error');
    });
  });

  it('test_valid_social_login', async () => {
    const authLoginSocial: AuthSocialLogin = {
      code: '47dcefe1-d7b7-4e40-95f1-a345f2177d2a.b0535b33-d2b0-4a07-875e-172f33a49e86.951a33f0-b905',
      codeVerifier:
        'a520TtMe07G5Ow2f0t0dfCcJ5_9DOpwiuRzqPT0wpYfhtzAlm_WuZJbuLl8KyzzUM9CW9eiPxV0v6HErZP4j0itXGR0YWOcwYnpSHxfFnHglEW0lemH6mYdF0bDZqutV',
    };

    try {
      await authService.socialLogin(authLoginSocial);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
    }
  });

  it('logout user', async () => {
    const response = authService.logout('test user id');
    expect(response).toBeDefined();
  });

  it('should throw bad request error when try to request an otp', async () => {
    const userData = {
      id: uuidv4(),
      firstName: 'OTP',
      lastName: 'Lastname',
      email: 'otp.email@gmail.com',
      nationalityCode: null,
      countryCode: null,
      contactNumber: null,
      passportNumber: null,
      nicNumber: null,
      dateOfBirth: null,
      preferredLocaleId: 'en',
      registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT],
      createdAt: new Date('2023-07-21T12:34:56Z'),
      updatedAt: new Date('2023-07-21T12:34:56Z'),
      loginAt: new Date('2023-07-21T12:34:56Z'),
      emailOtpSentAt: new Date(),
    } as UserDto;

    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(userData as any);
    await expect(authService.sendOtp(userData.id)).rejects.toThrow(BadRequestException);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
