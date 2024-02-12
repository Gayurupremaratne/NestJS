import { AbilitiesGuard } from '../../casl/abilities.guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { MockAuthGuard } from '@common/mock-modules/auth.guard.mock';
import { JsonResponse } from '@common/types';
import { Test, TestingModule } from '@nestjs/testing';
import { roledSeedData } from '@prisma-config/seeders';
import { Prisma } from '@prisma/client';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserRepository } from '@user/user.repository';
import { AuthGuard } from 'nest-keycloak-connect';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoleDto } from '../../role/dto/role.dto';
import { reqParamsDto } from '../dto/req-params.dto';
import { PermissionsController } from '../permissions.controller';
import { PermissionsService } from '../permissions.service';
import { UserService } from '@user/user.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let prismaService: PrismaService;
  let createdRole: RoleDto;

  const mockKeycloakService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockStaticContentService = {
    getSignedUrlForStaticMedia: jest.fn(),
    s3DeleteObjects: jest.fn(),
    deleteAssetKeys: jest.fn(),
  };

  const mockUserPublisher = {
    deleteUser: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        PermissionsService,
        PrismaService,
        UserService,
        UserRepository,
        StaticContentService,
        StaticContentRepository,
        { provide: KeycloakService, useValue: mockKeycloakService },
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        {
          provide: StaticContentService,
          useValue: mockStaticContentService,
        },
        {
          provide: UserQueuePublisher,
          useValue: mockUserPublisher,
        },
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    prismaService = module.get<PrismaService>(PrismaService);

    // Create a role for role based permissions tests
    const body = {
      id: roledSeedData.length + 1,
      name: 'test-role',
    };

    const role = await prismaService.role.findFirst({
      where: {
        name: body.name,
      },
    });

    if (role) {
      createdRole = role;
      return;
    }

    const result = await prismaService.role.create({
      data: body,
    });
    createdRole = result;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all permissions', async () => {
    const result = await controller.findAll();
    expect(result).toBeDefined();
  });

  it('should assign permission to role', async () => {
    const reqParams: reqParamsDto = {
      roleId: createdRole.id,
    };

    const body = [
      {
        id: uuidv4(),
        permissionId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: createdRole.id,
      },
    ];

    try {
      const result = await controller.assignPermissionsToRole(reqParams, body);
      expect(result).toBeDefined();
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  it('update permission to role', async () => {
    const reqParams: reqParamsDto = {
      roleId: createdRole.id,
    };

    const body = [
      {
        id: uuidv4(),
        permissionId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: createdRole.id,
      },
    ];
    const expected: JsonResponse<Prisma.BatchPayload> = { data: { count: 1 } };
    const result = await controller.updatePermissionsToRole(reqParams, body);
    expect(result).toStrictEqual(expected);
  });

  it('should throw exception when updating invalid role id', async () => {
    const reqParams: reqParamsDto = {
      roleId: 1,
    };

    const body = [
      {
        id: uuidv4(),
        permissionId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: createdRole.id,
      },
    ];
    try {
      await controller.updatePermissionsToRole(reqParams, body);
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.response).toBe('Cannot update permissions on default roles');
    }
  });

  // Clean up created role after each test
  afterAll(async () => {
    await prismaService.role.delete({
      where: {
        id: createdRole.id,
      },
    });
  });
});
