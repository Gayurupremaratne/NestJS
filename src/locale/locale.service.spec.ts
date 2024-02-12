import { Test, TestingModule } from '@nestjs/testing';
import { LocaleService } from './locale.service';
import { PrismaService } from '../prisma/prisma.service';
import { localesData } from '@prisma-config/seeders';

describe('LocaleService', () => {
  let service: LocaleService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocaleService, PrismaService],
    }).compile();

    service = module.get<LocaleService>(LocaleService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to return all the seeded records', async () => {
    const locales = await prismaService.locale.findMany();

    expect(locales).toStrictEqual(localesData);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
