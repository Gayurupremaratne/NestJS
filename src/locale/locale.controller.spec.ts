import { Test, TestingModule } from '@nestjs/testing';
import { LocaleController } from './locale.controller';
import { LocaleService } from './locale.service';
import { PrismaService } from '../prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { localesData } from '@prisma-config/seeders';
import { JsonResponseSerializer } from '@common/serializers';

describe('LocaleController', () => {
  let app: INestApplication;
  let controller: LocaleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocaleController],
      providers: [LocaleService, PrismaService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<LocaleController>(LocaleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all the defined locales in the seeder', async () => {
    const response = await request(app.getHttpServer()).get('/locales');

    expect(response.status).toBe(200);
    expect({ data: response.body.data }).toStrictEqual(JsonResponseSerializer(localesData));
  });

  afterAll(async () => {
    await app.close();
  });
});
