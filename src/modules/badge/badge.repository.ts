import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Badge, Prisma, UserAwardedBadge } from '@prisma/client';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GetAllBadgeDto } from './dto/all-badge.dto';
import { BADGE_TYPES } from '@common/constants';
import { parseSortOrder } from '@common/helpers/parse-sort';
import * as Sentry from '@sentry/node';

@Injectable()
export class BadgeRepository {
  constructor(private prisma: PrismaService) {}

  async createBadge(createBadgeDto: CreateBadgeDto): Promise<Badge> {
    try {
      return await this.prisma.badge.create({
        data: {
          badgeKey: createBadgeDto.badgeKey,
          type: createBadgeDto.type,
          stageId: createBadgeDto.stageId,
          badgeTranslation: {
            createMany: {
              data: createBadgeDto.badgeTranslation,
            },
          },
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'badge' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException();
        }
      }
      throw new InternalServerErrorException();
    }
  }

  async getAllBadges(data: GetAllBadgeDto): Promise<PaginatedResult<Badge>> {
    const paginate: PaginateFunction = paginator({ perPage: data?.perPage });
    return await paginate(
      this.prisma.badge,
      {
        include: {
          badgeTranslation: true,
          assetKeys: true,
          stage: {
            include: {
              stagesTranslation: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        where: {
          OR: [
            {
              stage: {
                open: true,
              },
            },
            {
              stageId: null,
            },
          ],
          badgeTranslation: {
            some: {
              name: {
                contains: data.search,
                mode: 'insensitive',
              },
            },
          },
        },
      },
      {
        page: data.pageNumber,
      },
    );
  }

  async getAllBadgesEn(data: GetAllBadgeDto): Promise<PaginatedResult<Badge>> {
    const paginate: PaginateFunction = paginator({ perPage: data?.perPage });
    return await paginate(
      this.prisma.badgeEn,
      {
        where: {
          name: {
            contains: data.search,
            mode: 'insensitive',
          },
        },
        orderBy: parseSortOrder(data.sortBy, 'BadgeEn'),
      },
      {
        page: data.pageNumber,
      },
    );
  }

  async getLoggedUserLatestBadge(userId: string): Promise<Badge> {
    const latestUserBadge = await this.prisma.userAwardedBadge.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        badge: {
          include: {
            badgeTranslation: {
              include: {
                locale: true,
              },
            },
          },
        },
      },
    });
    return latestUserBadge.badge;
  }

  async getBadge(id: string): Promise<Badge> {
    const badge = await this.prisma.badge.findUnique({
      where: { id },
      include: {
        badgeTranslation: true,
        assetKeys: true,
        stage: {
          include: {
            stagesTranslation: true,
          },
        },
        userAwardedBadge: true,
      },
    });
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }
    return badge;
  }

  async getBadgeByStageId(stageId: string): Promise<Badge> {
    try {
      const badge = await this.prisma.badge.findFirst({
        where: {
          stageId: stageId,
        },
        include: {
          badgeTranslation: true,
          assetKeys: true,
          stage: {
            include: {
              stagesTranslation: true,
            },
          },
        },
      });
      if (!badge) {
        return {} as Badge;
      }

      return badge;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'badge' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async checkBadgeUpdateConstraints(
    id: string,
    updateBadgeDto: UpdateBadgeDto,
    existingBadge: Badge,
    existingBadgeForNewStage: Badge,
    userAwardedBadge: UserAwardedBadge,
  ) {
    if (updateBadgeDto.type !== existingBadge.type && userAwardedBadge) {
      throw new ConflictException(
        "You cannot update the type of this badge since it's already assigned to a user.",
      );
    }

    if (updateBadgeDto.stageId && updateBadgeDto.stageId !== existingBadge.stageId) {
      if (existingBadgeForNewStage) {
        throw new ConflictException('The new stage already has a badge');
      }
    }
  }

  async updateBadge(id: string, updateBadgeDto: UpdateBadgeDto): Promise<Badge> {
    let transaction;

    try {
      transaction = await this.prisma.$transaction(async (tx) => {
        const existingBadge = await tx.badge.findUnique({
          where: {
            id,
          },
        });

        const userAwardedBadge = await tx.userAwardedBadge.findFirst({
          where: {
            badgeId: id,
          },
        });
        const existingBadgeForNewStage = await tx.badge.findFirst({
          where: {
            stageId: updateBadgeDto.stageId,
          },
        });

        await this.checkBadgeUpdateConstraints(
          id,
          updateBadgeDto,
          existingBadge,
          existingBadgeForNewStage,
          userAwardedBadge,
        );
        const data: Prisma.BadgeUpdateInput = {
          type: updateBadgeDto.type,
        };

        if (updateBadgeDto.type === 'STAGE_COMPLETION' && updateBadgeDto.stageId) {
          data.stage = { connect: { id: updateBadgeDto.stageId } };
        } else if (updateBadgeDto.type === 'MANUAL') {
          data.stage = { disconnect: true };
        }

        const badge = await tx.badge.update({
          where: { id },
          data,
          include: { badgeTranslation: true },
        });

        await tx.badge.update({
          where: { id },
          data: {
            badgeKey: updateBadgeDto.badgeKey,
          },
        });

        const updatePromises = updateBadgeDto.badgeTranslation.map(async (translation) => {
          const { localeId, name, description } = translation;

          const translationData = {
            badgeId: id,
            localeId: translation.localeId,
            name: name,
            description: description,
          };

          await tx.badgeTranslation.upsert({
            where: {
              badgeId_localeId: {
                badgeId: id,
                localeId,
              },
            },
            create: translationData,
            update: translationData,
          });
        });

        await Promise.all(updatePromises);

        const updatedTranslations = await tx.badgeTranslation.findMany({
          where: {
            badgeId: id,
          },
        });

        badge.badgeTranslation = updatedTranslations;

        return badge;
      });

      return transaction;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'badge' }, level: 'error' });
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException();
    }
  }

  async deleteBadge(id: string): Promise<Badge> {
    const userAwardedBadge = await this.prisma.userAwardedBadge.findFirst({
      where: {
        badgeId: id,
      },
    });
    if (userAwardedBadge) {
      throw new BadRequestException(
        'You cannot delete this badge since its already assigned to a user.',
      );
    }

    const badge = await this.prisma.badge.delete({
      where: { id },
    });
    return badge;
  }

  async assignManualBadgeToUser(userId: string, badgeId: string): Promise<UserAwardedBadge> {
    try {
      const badge = await this.prisma.badge.findUnique({
        where: { id: badgeId, type: BADGE_TYPES[1] },
      });

      if (badge) {
        const userAwardedBadge = await this.prisma.userAwardedBadge.findFirst({
          where: { userId, badgeId },
        });
        if (!userAwardedBadge) {
          return await this.prisma.userAwardedBadge.create({
            data: {
              userId,
              badgeId,
              stageId: badge.stageId,
            },
          });
        }
        throw new BadRequestException('Badge already assigned to user');
      }
      throw new NotFoundException('Badge not found');
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'badge' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException();
        }
      }
      throw new InternalServerErrorException();
    }
  }

  async getUserBadges(userId: string): Promise<UserAwardedBadge[]> {
    const userBadges = await this.prisma.userAwardedBadge.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        badge: {
          include: {
            badgeTranslation: {
              include: {
                locale: true,
              },
            },
          },
        },
      },
    });
    return userBadges;
  }

  async deleteUserAssignedBadge(id: string): Promise<UserAwardedBadge> {
    const badge = await this.prisma.userAwardedBadge.delete({
      where: { id },
    });
    return badge;
  }
}
