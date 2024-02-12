import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsDto } from './dto/Permissions.dto';
import { CreatePermissionDto } from './dto/create-permissions.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<PermissionsDto[]> {
    try {
      const allPermissions = await this.prisma.permission.findMany();
      return plainToInstance(PermissionsDto, allPermissions);
    } catch (error) {
      throw new InternalServerErrorException('Error while fetching permissions');
    }
  }

  async assignPermissionsToRole(data: CreatePermissionDto[]): Promise<Prisma.BatchPayload> {
    try {
      const createPermissions = await this.prisma.rolePermission.createMany({
        data,
      });

      return createPermissions;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'permissions' }, level: 'error' });
      throw new InternalServerErrorException('Error while assigning permissions to role');
    }
  }

  async updatePermissionsToRole(data: CreatePermissionDto[]): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.rolePermission.deleteMany({
          where: {
            roleId: data[0].roleId,
          },
        });

        const createPermissions = await transaction.rolePermission.createMany({
          data,
        });

        return createPermissions;
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'permissions' }, level: 'error' });
      throw new InternalServerErrorException('Error while assigning permissions to role');
    }
  }
}
