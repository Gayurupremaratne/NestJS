import { PrismaService } from '../../prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleDto } from './dto/role.dto';
import { UserDto } from '@user/dto/user.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { QueryParamsDto } from './dto/query-params.dto';
import { parseSortOrder } from '@common/helpers/parse-sort';
import * as Sentry from '@sentry/node';

@Injectable()
export class RoleRepository {
  constructor(private prisma: PrismaService) {}

  async createRole(data: CreateRoleDto): Promise<Role> {
    try {
      return await this.prisma.role.create({
        data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'role' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException('Role already exists');
        }
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async getAllRoles(
    data: QueryParamsDto,
  ): Promise<PaginatedResult<(Role & { userCount: number })[]>> {
    const paginate: PaginateFunction = paginator({ perPage: data?.perPage });
    const whereClause: Prisma.RoleWhereInput = data.search
      ? {
          name: {
            contains: data.search,
            mode: 'insensitive',
          },
        }
      : {};

    const roles = await paginate(
      this.prisma.role,
      {
        orderBy: parseSortOrder(data.sortBy, 'Role'),
        where: whereClause,
      },
      {
        page: data.pageNumber,
      },
    );

    const rolesWithUserCounts = await Promise.all(
      roles.data.map(async (role: Role) => {
        const userCount = await this.prisma.user.count({
          where: {
            role_id: role.id,
          },
        });
        return { ...role, userCount };
      }),
    );

    roles.data = rolesWithUserCounts;

    return roles as PaginatedResult<(Role & { userCount: number })[]>;
  }

  async getRole(id: number): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { id: +id },
      include: {
        RolePermission: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException();
    }
    return role;
  }

  async updateRole(id: number, data: UpdateRoleDto): Promise<Role> {
    if (id <= 3) {
      throw new HttpException('Cannot update default roles', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.prisma.role.update({
        where: { id: +id },
        data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'role' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException('Role update failed, please check the ID');
        }
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async deleteRole(id: number): Promise<RoleDto> {
    if (id <= 3) {
      throw new HttpException('Cannot delete default roles', HttpStatus.FORBIDDEN);
    }

    const usersWithRole = await this.prisma.user.count({
      where: { role_id: +id },
    });

    if (usersWithRole > 0) {
      // Role has associated users, prevent deletion
      throw new HttpException('Cannot delete role with associated users', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        // Delete all permissions associated with role
        await transaction.rolePermission.deleteMany({
          where: { roleId: +id },
        });

        return transaction.role.delete({ where: { id: +id } });
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'role' }, level: 'error' });
      throw new InternalServerErrorException('Failed to delete role');
    }
  }

  async assignPermissionsToRole(userId: string, roleId: number): Promise<UserDto> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role_id: roleId },
      });

      return updatedUser;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'role' }, level: 'error' });
      throw new InternalServerErrorException('Failed to assign role to user');
    }
  }
}
