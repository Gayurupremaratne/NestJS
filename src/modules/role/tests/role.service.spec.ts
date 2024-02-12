import { PrismaService } from '../../../prisma/prisma.service';
import { RoleService } from '../role.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleRepository } from '../role.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { HttpException } from '@nestjs/common';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { v4 as uuidv4 } from 'uuid';
import { RoleDto } from '../dto/role.dto';
import { QueryParamsDto } from '../dto/query-params.dto';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { Queue } from 'bull';

describe('RoleService', () => {
  let roleService: RoleService;
  let prisma: PrismaService;

  const testRoleName = `test${uuidv4()}`;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        PrismaService,
        RoleRepository,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    roleService = module.get<RoleService>(RoleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('test env', () => {
    it('should have a DATABASE_URL', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  it('RoleService - should be defined', () => {
    expect(roleService).toBeDefined();
  });

  describe('role crud', () => {
    let createdRole: RoleDto;
    it('role creation', async () => {
      const role: CreateRoleDto = {
        name: testRoleName,
      };

      try {
        const newCreatedRole = await prisma.role.create({
          data: { ...role, id: 1000 },
        });
        createdRole = Object.assign({}, newCreatedRole);
        expect(createdRole).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('Test role dreation not allowed', async () => {
      const role: CreateRoleDto = {
        name: testRoleName,
      };

      try {
        await roleService.createRole(role);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('Test get all roles', async () => {
      const params: QueryParamsDto = {
        perPage: 10,
        pageNumber: 1,
        search: '',
      };
      try {
        await roleService.getAllRoles(params);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('Test get a role by roleId', async () => {
      const getRole = await roleService.getRole(createdRole.id);
      expect(getRole).toBeDefined();
    });

    it('Test update role', async () => {
      const role: UpdateRoleDto = {
        name: 'TestRole_01',
      };

      const updatedRole = await roleService.updateRole(createdRole.id, role);
      expect(updatedRole).toBeDefined();
      createdRole = Object.assign({}, updatedRole);
    });

    it('Test delete role', async () => {
      const deletedRole = await roleService.deleteRole(createdRole.id);
      expect(deletedRole).toBeDefined();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });
  });
});
