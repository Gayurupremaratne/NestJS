import { PolicyAcceptancesService } from './policy-acceptances.service';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PolicyAcceptancesController } from './policy-acceptances.controller';
import { PoliciesService } from '@policies/policies.service';
import { REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

describe('PoliciesController', () => {
  let app: INestApplication;
  let policyAcceptancesController: PolicyAcceptancesController;
  let policiesService: PoliciesService;
  let policyAcceptancesService: PolicyAcceptancesService;
  let prismaService: PrismaService;

  const policies: Omit<Prisma.PolicyCreateInput, 'order'>[] = [
    {
      id: uuidv4(),
      acceptanceRequired: true,
      isGroupParent: true,
    },
    {
      id: uuidv4(),
      acceptanceRequired: true,
      isGroupParent: false,
    },
    {
      id: uuidv4(),
      acceptanceRequired: true,
      isGroupParent: false,
    },
  ];

  const mockUser: Prisma.UserCreateInput = {
    id: uuidv4(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: `${uuidv4()}.com` }),
    nationalityCode: faker.location.countryCode('alpha-2'),
    countryCode: '+94',
    contactNumber: faker.phone.number().replace(/\D/g, ''),
    passportNumber: null,
    nicNumber: '199912345678',
    dateOfBirth: faker.date.birthdate({
      min: 18,
    }),
    registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyAcceptancesController],
      providers: [PoliciesService, PrismaService, PolicyAcceptancesService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    policyAcceptancesController = module.get<PolicyAcceptancesController>(
      PolicyAcceptancesController,
    );
    policiesService = module.get<PoliciesService>(PoliciesService);
    prismaService = module.get<PrismaService>(PrismaService);
    policyAcceptancesService = module.get<PolicyAcceptancesService>(PolicyAcceptancesService);

    const nextOrder = await policiesService.nextOrder();

    await Promise.all([
      ...policies.map((policy, i) =>
        policiesService.create({
          ...policy,
          order: nextOrder + i,
        }),
      ),
      prismaService.user.create({ data: mockUser }),
    ]);
  });

  it('should be defined', () => {
    expect(policyAcceptancesController).toBeDefined();
    expect(policiesService).toBeDefined();
    expect(policyAcceptancesController).toBeDefined();
    expect(prismaService).toBeDefined();
    expect(app).toBeDefined();
  });

  it('should return a list of policy-acceptances for user', async () => {
    const response = await policyAcceptancesController.getAllPolicyAcceptances({
      sub: mockUser.id,
    });

    const policiesThatRequireAcceptance = policies
      .filter((policy) => policy.acceptanceRequired && !policy.isGroupParent)
      .map((policy) => policy.id);

    expect(Object.keys(response.data)).toHaveLength(policiesThatRequireAcceptance.length);
  });

  it('should accept policy acceptance', async () => {
    const requiredPolicies = await policyAcceptancesService.getPoliciesThatRequireAcceptance();

    await policyAcceptancesController.acceptPolicy(
      {
        id: requiredPolicies[0],
      },
      {
        sub: mockUser.id,
      },
    );

    const count = await prismaService.policyAcceptances.count({
      where: {
        userId: mockUser.id,
      },
    });

    expect(count).toBe(1);
  });

  afterAll(async () => {
    await Promise.all([
      ...policies.map((policy) => policiesService.remove(policy.id)),
      prismaService.user.delete({ where: { id: mockUser.id } }),
    ]);

    await prismaService.$disconnect();
    await app.close();
  });
});
