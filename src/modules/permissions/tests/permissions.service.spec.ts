import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionsService } from '../permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService, PrismaService],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get all the permissions', async () => {
    const permissions = await service.findAll();
    expect(permissions).toBeDefined();
  });

  it('should failes to assign permissions', async () => {
    try {
      await service.assignPermissionsToRole(null);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should failes to update permissions', async () => {
    try {
      await service.updatePermissionsToRole(null);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should throw an error if the permissions are not found', async () => {
    jest.spyOn(service, 'findAll').mockImplementation(async () => {
      throw new InternalServerErrorException();
    });

    await expect(service.findAll()).rejects.toThrow();
  });
});
