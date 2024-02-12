import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserTrailTrackingSummaryDto } from './dto/get-user-trail-summary-results.dto';
import { TRAIL_COMPLETION_PERCENTAGE } from '@common/constants';
import {
  COMPLETION_STATUS,
  TRAIL_START_PERCENTAGE,
} from '../../../common/constants/global.constants';
import { GetUserTrailSummaryStageResponse } from './dto/get-user-trail-summary-by-stage-response.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { GetUserTrailTrackingSummaryPassIdResponseDto } from './dto/get-user-tail-summary-by-passId-response.dto';
import { GetAllUsersTrailSummaryResponseDto } from './dto/get-all-users-trail-summary-response.dto';
import { GetAllUsersTrailSummaryParamsDto } from './dto/get-all-users-trail-summary-params.dto';
import moment from 'moment';

@Injectable()
export class UserTrailTrackingSummaryService {
  constructor(private prisma: PrismaService) {}

  async getUserTrailTrackingSummary(userId: string): Promise<UserTrailTrackingSummaryDto> {
    try {
      return await this.prisma.$queryRaw<UserTrailTrackingSummaryDto>`SELECT
        CAST(SUM(
          CASE
            WHEN TRUNC(user_trail_tracking.completion) = ${TRAIL_COMPLETION_PERCENTAGE} OR user_trail_tracking.is_completed = TRUE THEN
              1
            ELSE
              0
          END) AS INTEGER) AS "totalCompletedStages",
        SUM(user_trail_tracking.total_time) AS "totalDuration",
        SUM(user_trail_tracking.distance_traveled) AS "totalDistanceTraveled",
        (
          SELECT
          CAST(COUNT(DISTINCT id) AS INTEGER
        )
          FROM
            stages) AS "totalStages",
        (
          SELECT
          CAST(COUNT(DISTINCT id) AS INTEGER
        )
          FROM
            user_awarded_badges
          WHERE user_awarded_badges.user_id = ${userId}::uuid
        ) AS "totalAwardedBadges"
      FROM
        user_trail_tracking
        INNER JOIN passes ON passes.id = user_trail_tracking.passes_id
      WHERE
        passes.activated = TRUE
        AND user_trail_tracking.user_id = ${userId}::uuid
      GROUP BY
        user_trail_tracking.user_id`;
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching user trail summary',
      );
    }
  }

  async getUserTrailTrackingOfAllStages(
    userId: string,
    pageNumber: number,
    perPage?: number,
    type?: string,
  ): Promise<PaginatedResult<GetUserTrailSummaryStageResponse>> {
    try {
      const whereClause = {
        userId,
        activated: true,
      };

      switch (type) {
        case COMPLETION_STATUS.COMPLETE:
          whereClause['userTrailTracking'] = {
            is: {
              userId,
              OR: [
                {
                  completion: {
                    equals: TRAIL_COMPLETION_PERCENTAGE,
                  },
                },
                {
                  isCompleted: {
                    equals: true,
                  },
                },
              ],
            },
          };
          break;
        case COMPLETION_STATUS.INCOMPLETE:
          whereClause['OR'] = [
            {
              userTrailTracking: {
                userId,
                completion: {
                  lt: TRAIL_COMPLETION_PERCENTAGE,
                },
                isCompleted: {
                  equals: false,
                },
              },
            },
            {
              userTrailTracking: null,
            },
          ];
          break;
        default:
          break;
      }

      const paginate: PaginateFunction = paginator({ perPage });

      return await paginate(
        this.prisma.passes,
        {
          where: whereClause,
          include: {
            stage: {
              include: {
                stagesTranslation: {
                  select: {
                    stageHead: true,
                    stageTail: true,
                    localeId: true,
                  },
                },
              },
            },
            userTrailTracking: {
              where: {
                userId,
              },
              select: {
                isCompleted: true,
                completion: true,
              },
            },
            order: {
              select: {
                id: true,
                reservedFor: true,
                createdAt: true,
              },
            },
          },
        },
        { page: pageNumber },
      );
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong while fetching the request');
    }
  }

  async getUserTrailTrackingByPassId(
    passId: string,
    userId: string,
  ): Promise<GetUserTrailTrackingSummaryPassIdResponseDto> {
    try {
      const trailTrackData = await this.prisma.userTrailTracking.findFirst({
        where: {
          passesId: passId,
          userId: userId,
        },
      });

      const passDetails = await this.prisma.passes.findFirst({
        where: {
          id: passId,
          userId: userId,
        },
        include: {
          stage: {
            include: {
              stagesTranslation: {
                select: {
                  stageHead: true,
                  stageTail: true,
                  localeId: true,
                },
              },
              userAwardedBadges: {
                include: {
                  badge: {
                    select: { badgeKey: true },
                  },
                },
                where: {
                  userId: userId,
                  passId: passId,
                },
              },
            },
          },
        },
      });

      return {
        ...trailTrackData,
        passes: passDetails,
      };
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong while fetching the request');
    }
  }

  async getAllUsersTrailCompletionSummary(
    params: GetAllUsersTrailSummaryParamsDto,
  ): Promise<GetAllUsersTrailSummaryResponseDto> {
    try {
      const transaction = await this.prisma.$transaction<GetAllUsersTrailSummaryResponseDto>(
        async (prisma) => {
          const startDate = moment({ year: params.year, month: params.month - 1, day: 1 });
          const endDate = startDate.clone().endOf('month');

          const totalCompletedUsers = await prisma.userTrailTracking.count({
            where: {
              OR: [
                {
                  completion: {
                    equals: TRAIL_COMPLETION_PERCENTAGE,
                  },
                },
                {
                  isCompleted: {
                    equals: true,
                  },
                },
              ],
              passes: {
                stageId: {
                  equals: params.stageId === 'All' ? undefined : params.stageId,
                },
              },
              timestamp: {
                gte: startDate.toDate(),
                lte: endDate.toDate(),
              },
            },
          });

          const totalPartiallyCompleteUsers = await prisma.userTrailTracking.count({
            where: {
              completion: {
                lt: TRAIL_COMPLETION_PERCENTAGE,
                gt: TRAIL_START_PERCENTAGE,
              },
              isCompleted: {
                equals: false,
              },
              passes: {
                stageId: {
                  equals: params.stageId === 'All' ? undefined : params.stageId,
                },
              },
              timestamp: {
                gte: startDate.toDate(),
                lte: endDate.toDate(),
              },
            },
          });

          const totalPasses = await prisma.passes.count({
            where: {
              activated: true,
              stageId: {
                equals: params.stageId === 'All' ? undefined : params.stageId,
              },
              reservedFor: {
                gte: new Date(startDate.format('YYYY-MM-DD')),
                lte: new Date(endDate.format('YYYY-MM-DD')),
              },
            },
          });

          const totalNotAttemptedUsers =
            totalPasses - (totalCompletedUsers + totalPartiallyCompleteUsers);

          return {
            totalCompletedUsers: totalCompletedUsers,
            totalPartiallyCompleteUsers: totalPartiallyCompleteUsers,
            totalNotAttemptedUsers: totalNotAttemptedUsers,
          };
        },
      );

      return transaction;
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching all users trail completion summary',
      );
    }
  }
}
