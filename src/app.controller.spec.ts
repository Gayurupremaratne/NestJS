import { Test } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import request from 'supertest';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import { RELEASE_VERSION, MINIMUM_MOBILE_VERSION } from './common';

describe('AppController', () => {
  let app: INestApplication;
  let i18nService: I18nService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    i18nService = await moduleRef.resolve(I18nService);
  });

  it('should default to English', async () => {
    const response = await request(app.getHttpServer()).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      data: i18nService.t('health.ok', {
        lang: 'en',
      }),
    });
  });

  it('should display in French if Accept-Language requests it', async () => {
    const response = await request(app.getHttpServer()).get('/').set('Accept-Language', 'fr');

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      data: i18nService.t('health.ok', {
        lang: 'fr',
      }),
    });
  });

  it('should return app versions when invoked', async () => {
    const response = await request(app.getHttpServer()).get('/versions');

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      data: {
        minimumMobileVersion: MINIMUM_MOBILE_VERSION,
        currentApiVersion: RELEASE_VERSION,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
