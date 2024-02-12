import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';
import { AppConfig } from '@config/app-config';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '@user/user.repository';
import { UserService } from '@user/user.service';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockAuthGuard } from '../../../common/mock-modules/auth.guard.mock';
import { PrismaService } from '../../../prisma/prisma.service';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { PassesService } from '../../passes/passes.service';
import { StaticContentRepository } from '../../static-content/static-content.repository';
import { StaticContentService } from '../../static-content/static-content.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RoleIdentifierDto } from '../dto/role-get-param.dto';
import { RoleDto } from '../dto/role.dto';
import { RoleController } from '../role.controller';
import { RoleRepository } from '../role.repository';
import { RoleService } from '../role.service';
import { MailConsumer } from '../../../worker/mail/mail.consumer';
import { QUEUES } from '@common/constants';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('RoleController', () => {
  let controller: RoleController;
  let prisma: PrismaService;
  let createdRole: RoleDto;
  let app: INestApplication;
  const testRoleName = `test${uuidv4()}`;
  let mockAbilitiesGuard: AbilitiesGuard;

  const mockConsumerMail = {
    sendQueueEmail: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [RoleController],
      providers: [
        RoleService,
        RoleRepository,
        PrismaService,
        {
          provide: AbilitiesGuard,
          useClass: MockAbilitiesGuard,
        },
        StaticContentService,
        StaticContentRepository,
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
        UserService,
        UserRepository,
        KeycloakService,
        PassesService,
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockQueue },
        { provide: MailConsumer, useValue: mockConsumerMail },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<RoleController>(RoleController);
    prisma = module.get<PrismaService>(PrismaService);
    mockAbilitiesGuard = module.get<AbilitiesGuard>(AbilitiesGuard);

    jest.spyOn(mockAbilitiesGuard, 'canActivate').mockImplementation(async () => true);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create role', async () => {
    const reqBody: CreateRoleDto = {
      name: testRoleName,
    };
    const response = await request(app.getHttpServer()).post('/roles').send(reqBody);
    createdRole = Object.assign({}, response.body.data);
    expect(response).toBeDefined();
  });

  it('get all roles', () => {
    expect(controller.getAllRoles({ perPage: 1, pageNumber: 10, search: '' })).toBeDefined();
  });

  it('get role by id', () => {
    const roleReqData: RoleIdentifierDto = {
      id: 1,
    };
    expect(controller.getRole(roleReqData)).toBeDefined();
  });

  it('update role', async () => {
    const roleReqData: RoleIdentifierDto = {
      id: createdRole.id,
    };
    const response = await request(app.getHttpServer()).put('/roles').send(roleReqData);

    createdRole = Object.assign({}, response.body.data);
    expect(response).toBeDefined();
  });

  it('delete role', async () => {
    const roleReqData: RoleIdentifierDto = {
      id: createdRole.id,
    };
    const response = await request(app.getHttpServer()).delete('/roles').send(roleReqData);
    expect(response).toBeDefined();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
