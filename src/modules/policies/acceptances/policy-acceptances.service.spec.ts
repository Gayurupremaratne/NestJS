import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Prisma } from '@prisma/client';
import { PolicyAcceptancesService } from './policy-acceptances.service';
import { v4 as uuidv4 } from 'uuid';
import { PoliciesService } from '@policies/policies.service';
import { REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { faker } from '@faker-js/faker';

describe('PolicyAcceptancesService', () => {
  let policyAcceptancesService: PolicyAcceptancesService;
  let policiesService: PoliciesService;
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
      providers: [PolicyAcceptancesService, PoliciesService, PrismaService],
    }).compile();

    policyAcceptancesService = module.get<PolicyAcceptancesService>(PolicyAcceptancesService);
    policiesService = module.get<PoliciesService>(PoliciesService);
    prismaService = module.get<PrismaService>(PrismaService);

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
    expect(policiesService).toBeDefined();
    expect(policyAcceptancesService).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  it('should return policies that require acceptance', async () => {
    const policiesRequiringAcceptance =
      await policyAcceptancesService.getPoliciesThatRequireAcceptance();

    const policiesThatRequireAcceptance = policies.filter(
      (policy) => policy.acceptanceRequired && !policy.isGroupParent,
    );

    const resultingRecords = policiesRequiringAcceptance.filter((result) => {
      return !!policies.find((policy) => policy.id === result);
    });

    expect(resultingRecords).toHaveLength(policiesThatRequireAcceptance.length);
  });

  it('should return a record of users acceptance status for all policies that require acceptance', async () => {
    const policyList = await policyAcceptancesService.getAllUserAcceptances(mockUser.id);

    // check if all values are false since we just created the user and they have not accepted any.
    expect(Object.values(policyList).every(Boolean.call.bind(Boolean, false))).toBe(false);
  });

  it('should create a policy acceptance record', async () => {
    const policyList = await policyAcceptancesService.getAllUserAcceptances(mockUser.id);

    await policyAcceptancesService.acceptPolicy(mockUser.id, Object.keys(policyList)[0]);

    const count = await prismaService.policyAcceptances.count({
      where: {
        userId: mockUser.id,
      },
    });

    // No previous acceptances, so this has to be 1.
    expect(count).toBe(1);
  });

  it('should delete acceptances if the user is deleted', async () => {
    await prismaService.user.delete({
      where: {
        id: mockUser.id,
      },
    });

    const count = await prismaService.policyAcceptances.count({
      where: {
        userId: mockUser.id,
      },
    });

    expect(count).toBe(0);
  });

  afterAll(async () => {
    await Promise.all(policies.map((policy) => policiesService.remove(policy.id)));
    await prismaService.$disconnect();
  });
});
