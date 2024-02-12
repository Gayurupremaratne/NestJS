import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from '@policies/policies.service';
import { PrismaService } from '@prisma-orm/prisma.service';
import { TranslationsService } from './translations.service';
import { faker } from '@faker-js/faker';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { MockAbilitiesGuard } from '../../../common/mock-modules/abilities.guard.mock';
describe('TranslationsService', () => {
  let policiesService: PoliciesService;
  let policiesTranslationsService: TranslationsService;
  let prismaService: PrismaService;
  let mockAbilitiesGuard: AbilitiesGuard;

  let policyId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        PrismaService,
        TranslationsService,
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
      ],
    }).compile();

    policiesService = module.get<PoliciesService>(PoliciesService);
    policiesTranslationsService = module.get<TranslationsService>(TranslationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);

    const result = await policiesService.create({
      order: await policiesService.nextOrder(),
      acceptanceRequired: true,
      icon: 'abcd.jpg',
      isGroupParent: true,
    });

    policyId = result.id;

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(policiesService).toBeDefined();
    expect(policiesTranslationsService).toBeDefined();
    expect(policyId).toBeDefined();
  });

  it('should create policy translation', async () => {
    const translationResult = await policiesTranslationsService.upsert({
      title: faker.lorem.words(5),
      description: faker.lorem.lines(1),
      content: faker.lorem.sentences(2),
      policyId,
      localeId: 'en',
    });

    expect(translationResult).toBeDefined();
  });

  it('cascades deletes when policy is removed', async () => {
    await policiesService.remove(policyId);

    const result = await prismaService.policyTranslations.findUnique({
      where: {
        policyId_localeId: {
          policyId,
          localeId: 'en',
        },
      },
    });

    expect(result).toBeNull();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
