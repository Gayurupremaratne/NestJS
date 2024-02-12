import { UnprocessableException } from '@common/exceptions/UnprocessableException';
import { IAppConfig } from '@common/types';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import { useContainer } from 'class-validator';
import * as admin from 'firebase-admin';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';

import { SentryFilter } from '@common/filters/sentry.filter';
import { SentryService } from '@travelerdev/nestjs-sentry';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { RELEASE_VERSION } from './common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          styleSrc: ["'self'", 'https:'],
        },
      },
    }),
  );

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler());

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => UnprocessableException(errors),
      validateCustomDecorators: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalPipes(new I18nValidationPipe());

  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: false,
    }),
  );

  app.use(cookieParser());

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const PORT = app.get(ConfigService).get<IAppConfig['PORT']>('PORT');
  const NODE_ENV = app.get(ConfigService).get<IAppConfig['NODE_ENV']>('NODE_ENV');
  const ADMIN_URL = app.get(ConfigService).get<IAppConfig['ADMIN_URL']>('ADMIN_URL');
  const FIREBASE_PRIVATE_KEY = app
    .get(ConfigService)
    .get<IAppConfig['FIREBASE_PRIVATE_KEY']>('FIREBASE_PRIVATE_KEY');
  const FIREBASE_CLIENT_EMAIL = app
    .get(ConfigService)
    .get<IAppConfig['FIREBASE_CLIENT_EMAIL']>('FIREBASE_CLIENT_EMAIL');
  const FIREBASE_PROJECT_ID = app
    .get(ConfigService)
    .get<IAppConfig['FIREBASE_PROJECT_ID']>('FIREBASE_PROJECT_ID');

  app.enableCors({
    origin: [ADMIN_URL],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  admin.initializeApp({
    credential: admin.credential.cert({
      private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: FIREBASE_CLIENT_EMAIL,
      project_id: FIREBASE_PROJECT_ID,
    } as Partial<admin.ServiceAccount>),
  });

  // Disable for Production
  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API Documentation description')
      .setVersion(`v${RELEASE_VERSION}`)
      .addBearerAuth({
        description: 'Please enter your access token below:',
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
      })
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  app.useLogger(SentryService.SentryServiceInstance());
  await app.listen(PORT);
}
bootstrap();
