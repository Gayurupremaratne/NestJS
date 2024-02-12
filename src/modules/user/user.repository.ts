import { NOTICE_QUEUE_BATCH_SIZE, USER_DELETION_DELAY_IN_DAYS } from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { parseSortOrder } from '@common/helpers/parse-sort';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { $Enums, DELIVERY_GROUP, Prisma, User } from '@prisma/client';
import * as Sentry from '@sentry/node';
import moment from 'moment';
import { PrismaService } from '../../prisma/prisma.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { NoticeUserDto } from '../notice/dto/notice-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationStatus } from './dto/profile.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDelete } from './dto/user-delete.dto';
import { UserEmail } from './dto/user-email.dto';

@Injectable()
export class UserRepository {
  constructor(
    private prisma: PrismaService,
    private keycloakService: KeycloakService,
  ) {}

  async getAllUsers({
    perPage,
    search,
    sortBy,
    pageNumber,
  }: QueryParamsDto): Promise<PaginatedResult<User>> {
    const paginate: PaginateFunction = paginator({ perPage: perPage });

    const searchQuery = search ? search.split(' ') : [];
    const whereClause =
      searchQuery.length > 0
        ? {
            OR: searchQuery.filter(Boolean).map((query) => ({
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            })),
          }
        : {};

    return paginate(
      this.prisma.user,
      {
        include: { role: true },
        orderBy: parseSortOrder(sortBy, 'User'),
        where: { ...whereClause, isDeleted: false },
      },
      {
        page: pageNumber,
      },
    );
  }

  async getUsersForDeletion(): Promise<UserDelete[]> {
    const users: UserDelete[] = await this.prisma.user.findMany({
      where: { deletionDate: { lt: new Date() }, isDeleted: false },
      select: { id: true },
    });
    return users;
  }

  async getUser(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false },
      include: { role: true, userFavouriteStages: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    try {
      const dateOfBirth = data?.dateOfBirth ? new Date(data.dateOfBirth) : undefined;

      return await this.prisma.user.create({
        data: { ...data, dateOfBirth },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'user' }, level: 'error' });
      await this.keycloakService.deleteUser(data.id);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException();
        }
      }
      throw new InternalServerErrorException();
    }
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    try {
      //check the user is getting banned, if the role is banned, user will be logged out from all sessions
      if (data?.role_id === RoleType.Banned) {
        await this.keycloakService.logout(id);
      }

      return await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          dateOfBirth: data?.dateOfBirth ? new Date(data.dateOfBirth) : null,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'user' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed

        if (error.code === 'P2002') {
          throw new UnprocessableEntityException();
        }
      }
      throw new InternalServerErrorException();
    }
  }

  async getPermissions(id: number) {
    try {
      return await this.prisma.rolePermission.findMany({
        where: {
          roleId: id,
        },
        include: { permission: true },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'user' }, level: 'error' });
      throw new NotFoundException('Unable to fetch permissions');
    }
  }

  async getUsersByRoleId(
    roleId: number,
    queryParams: QueryParamsDto,
  ): Promise<PaginatedResult<User>> {
    const paginate: PaginateFunction = paginator({ perPage: queryParams.perPage });

    const searchQuery = queryParams.search ? queryParams.search.split(' ') : [];

    const whereClause =
      searchQuery.length > 0
        ? {
            OR: searchQuery.filter(Boolean).map((query) => ({
              OR: [
                {
                  email: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  nicNumber: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            })),
          }
        : {};

    const data = paginate(
      this.prisma.user,
      {
        where: { ...whereClause, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      },
      {
        page: queryParams.pageNumber,
      },
    );

    // update the total count of users of meta
    const users = await data;
    users.meta.total = await this.prisma.user.count({
      where: {
        role_id: parseInt(roleId.toString()),
        deletionDate: null,
      },
    });

    return users as PaginatedResult<User>;
  }

  // get matching users by email wildcard
  async getUsersByEmail(email: string): Promise<UserEmail[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      where: {
        email: {
          contains: email,
        },
        role_id: {
          not: RoleType.Banned,
        },
        deletionDate: null,
      },
    });
  }

  async scheduleUserForDeletion(userId: string): Promise<User> {
    let updatedUser: User = null;
    const role = RoleType[RoleType.Banned];
    const defaultDate = new Date(0);
    const scheduleDate = moment().add(USER_DELETION_DELAY_IN_DAYS, 'days').toDate();

    const newRole = await this.prisma.role.findUnique({ where: { name: role } });
    if (newRole) {
      updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role_id: newRole.id,
          loginAt: defaultDate,
          deletionDate: scheduleDate,
        },
      });

      // log out the user from all sessions, this will prevent the user from refreshing the token again
      await this.keycloakService.logout(userId);
    }
    return updatedUser;
  }

  async getUserNotificationStatus(userId: string): Promise<NotificationStatus> {
    const notifications = await this.prisma.notifications.findMany({
      where: {
        userId,
      },
      select: {
        isRead: true,
        notice: {
          select: {
            deliveryGroup: true,
          },
        },
      },
    });

    const notificationStatus: NotificationStatus = {
      stage: notifications.some(
        (notification) =>
          notification.notice.deliveryGroup === DELIVERY_GROUP.STAGE && !notification.isRead,
      ),
      all: notifications.some(
        (notification) =>
          notification.notice.deliveryGroup === DELIVERY_GROUP.ALL && !notification.isRead,
      ),
    };
    return notificationStatus;
  }

  async getAllActiveUserIds(cursor: number): Promise<NoticeUserDto[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role_id: { not: RoleType.Banned },
          registrationStatus: $Enums.REGISTRATION_STATUS.COMPLETE,
        },
        select: {
          id: true,
        },
        skip: cursor,
        take: NOTICE_QUEUE_BATCH_SIZE,
        orderBy: {
          id: 'asc',
        },
      });
      return users;
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException('Unable to fetch active users');
    }
  }
}
