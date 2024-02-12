import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { LiteStageController } from '../lite-stage.controller';
import { LiteStageService } from '../lite-stage.service';
import { LiteStageRepository } from '../lite-stage.repository';
import { AbilitiesGuard } from '../../../casl/abilities.guard';
import { PrismaService } from '@prisma-orm/prisma.service';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';

describe('LiteStageController', () => {
  let app: INestApplication;
  let liteStageController: LiteStageController;
  let mockAbilitiesGuard: AbilitiesGuard;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiteStageController],
      providers: [
        LiteStageService,
        PrismaService,
        LiteStageRepository,
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    liteStageController = module.get<LiteStageController>(LiteStageController);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);
    prisma = module.get(PrismaService);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(liteStageController).toBeDefined();
  });

  describe('Get all stages for dropdowns', () => {
    it('should return stages for dropdowns with pagination', async () => {
      const response = await liteStageController.getAllForDropdown();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });
});
