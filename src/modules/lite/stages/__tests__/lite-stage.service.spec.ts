import { Test } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { LiteStageService } from '../lite-stage.service';
import { LiteStageRepository } from '../lite-stage.repository';

describe('LiteStageService', () => {
  let prisma: PrismaService;
  let liteStageService: LiteStageService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LiteStageService, PrismaService, LiteStageRepository],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    liteStageService = moduleRef.get(LiteStageService);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Get all stages for dropdown', () => {
    it('should get all stages for dropdown', async () => {
      const retrievedStages = await liteStageService.getAllForDropdown();
      expect(Array.isArray(retrievedStages)).toBeTruthy();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
