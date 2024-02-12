import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from '@policies/policies.service';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Prisma } from '@prisma/client';

describe('PoliciesService', () => {
  let policiesService: PoliciesService;

  const cleanUpIds: string[] = [];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoliciesService, PrismaService],
    }).compile();

    policiesService = module.get<PoliciesService>(PoliciesService);
  });

  it('should be defined', () => {
    expect(policiesService).toBeDefined();
  });

  it('should create', async () => {
    const data: Prisma.PolicyCreateInput = {
      order: await policiesService.nextOrder(),
      acceptanceRequired: false,
      icon: 'abcd.jpg',
      isGroupParent: true,
    };

    const { order, acceptanceRequired, icon, isGroupParent, id } =
      await policiesService.create(data);

    cleanUpIds.push(id);

    expect({
      order,
      acceptanceRequired,
      icon,
      isGroupParent,
    }).toStrictEqual(data);

    expect(id).toBeDefined();
  });

  it('should fail to create', async () => {
    try {
      await policiesService.create(null);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should find all', async () => {
    const result = await policiesService.findAll();

    const foundRecord = result.find((policy) => policy.id === cleanUpIds[0]);

    expect(foundRecord).toBeDefined();
  });

  it('should find the record by id', async () => {
    const result = await policiesService.findOne(cleanUpIds[0]);

    expect(result).toBeDefined();
  });

  it('should update record by id', async () => {
    const result = await policiesService.update(cleanUpIds[0], {
      id: cleanUpIds[0],
      icon: 'policy.png',
      order: 0,
    });

    expect(result.icon).toEqual('policy.png');
  });

  it('should fail to update record by id', async () => {
    try {
      await policiesService.update(null, {
        id: cleanUpIds[0],
        icon: 'policy.png',
        order: 0,
      });
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should delete record by', async () => {
    await policiesService.remove(cleanUpIds[0]);

    expect(
      (async () => {
        await policiesService.findOne(cleanUpIds[0]);
      })(),
    ).rejects.toThrow(NotFoundException);
  });
});
