import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  CONFIG_NAMESPACES,
  DATE_FORMATS,
  EMAIL_TEMPLATES,
  MAIL_FROM,
  NOTICE_QUEUE_BATCH_SIZE,
  PASS_AMEND_EXPIRY_PERIOD,
  PASS_VALIDITY_PERIOD,
  PLATFORM,
  PassType,
  QUEUES,
} from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { IAppConfig } from '@common/types';
import { InjectQueue } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma-orm/prisma.service';
import { $Enums, PASS_TYPE, Passes, UserTrailTracking } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { Queue } from 'bull';
import moment from 'moment';
import * as nodemailer from 'nodemailer';
import { NoticeOrderDto } from '../notice/dto/notice-order.dto';
import { CancelledPassDto } from '../report/dto/cancelled-passes.dto';
import { StageWiseSummaryReportDto } from '../report/dto/stage-wise-summary-report.dto';
import { BulkPassCreate, GetPassDto, PassOrdersAggregate, PassesEntity, StageData } from './dto';
import { DateQueryDto } from './dto/date-query.dto';
import { UserActivePass } from './dto/response/user-active-pass.dto';

@Injectable()
export class PassesService {
  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue(QUEUES.MAIL) private readonly sendEmailQueuePasses: Queue,
  ) {}

  /**
   * Pass Filter Clause.
   * @param type - Pass type active, reserved or re
   * @returns Pass filter data.
   */
  private passFilterWhereClause(type: PassType): DateQueryDto {
    const currentDate: Date = new Date();
    let startDate = {};
    let endDate = {};
    switch (type) {
      case PassType.ACTIVE:
        startDate = {
          lte: currentDate, // Check if reservedFor is less than or equal to the current date
        };
        endDate = {
          gt: currentDate, // Check if expiredAt is greater than the current date
        };
        break;
      case PassType.EXPIRED:
        endDate = {
          lt: currentDate, // Check if expiredAt is less than the current date
        };
        break;
      case PassType.RESERVED:
        startDate = {
          gt: currentDate, // Check if reservedFor is greater than the current date
        };
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get necessary data for passes.
   *  @param type - Pass type active, reserved or re
   * @param whereClause - { userId: string; reservedFor?: Date; expiredAt?: Date }
   * @returns query data.
   */
  private getNecessaryData = (
    platform: string,
    type: PassType,
    whereClause: { userId: string; reservedFor?: Date; expiredAt?: Date; orderId: string },
  ) => {
    // If platform is mobile the type is required
    let necessaryData = {};
    if (platform === PLATFORM.mobile) {
      if (!type) {
        throw new UnprocessableEntityException('The status of the pass is necessary to process');
      }
      necessaryData = {
        passes: {
          where: whereClause,
          orderBy: { activated: 'desc' },
          select: {
            id: true,
            activated: true,
            expiredAt: true,
            reservedFor: true,
            passId: true,
          },
        },
        distance: true,
        estimatedDuration: true,
        number: true,
        difficultyType: true,
        openTime: true,
        closeTime: true,
        elevationGain: true,
        stagesTranslation: {
          select: {
            stageHead: true,
            stageTail: true,
            localeId: true,
          },
        },
      };
    } else {
      necessaryData = {
        number: true,
        stagesTranslation: {
          select: {
            stageHead: true,
            stageTail: true,
            localeId: true,
          },
        },
      };

      if (type) {
        necessaryData['passes'] = {
          where: whereClause,
          select: {
            id: true,
            activated: true,
          },
        };
      }
    }

    return necessaryData;
  };

  /**
   * Find all passes by a user and a filter with pagination.
   * @param data - The get pass dto which includes all quey params
   * @param userId - User Id of the logged in user
   * @param platform - Platform to check if mobile or web
   * @returns All passes related to user with pagination.
   */
  async findAllByUser(data: GetPassDto, userId: string, platform: string) {
    const { pageNumber, perPage, type } = data;

    // pagination data
    const paginate: PaginateFunction = paginator({
      page: pageNumber,
      perPage: perPage,
    });

    const whereClause = {
      userId: userId,
    };

    // Check the type and build the query for the date
    if (type) {
      const { startDate, endDate } = this.passFilterWhereClause(type);
      whereClause['reservedFor'] = startDate;
      whereClause['expiredAt'] = endDate;
    }

    const prisma = this.prisma.$extends({
      result: {
        passOrdersAggregateView: {
          status: {
            needs: { reservedFor: true, expiredAt: true },
            compute({ reservedFor, expiredAt }) {
              if (
                moment(reservedFor).isSameOrBefore(moment()) &&
                moment(expiredAt).isAfter(moment())
              ) {
                return PassType.ACTIVE;
              }
              if (moment(expiredAt).isBefore(moment())) {
                return PassType.EXPIRED;
              }
              if (moment(reservedFor).isAfter(moment())) {
                return PassType.RESERVED;
              }
            },
          },
        },
      },
    });

    /**
     * The below process is done in order to solve pagination and grouping issues, the conventional method cannot
     * be followed because the data structure the mobile requires is not achievable therefor the below method is
     * followed
     */
    // Get the paginated result from the PassOrdersAggregateView
    const res: PaginatedResult<PassOrdersAggregate> = await paginate(
      prisma.passOrdersAggregateView,
      {
        where: whereClause,
      },
      {
        page: pageNumber,
      },
    );

    for (const i of res.data) {
      const response: Partial<StageData> = await prisma.stage.findUnique({
        where: {
          id: i.stageId,
        },
        select: this.getNecessaryData(platform, type, { ...whereClause, orderId: i.orderId }),
      });

      if (response?.passes) {
        response?.passes.forEach((p) => {
          p['passValidityPeriod'] = PASS_VALIDITY_PERIOD;
        });
      }

      i.stageData = response as StageData;
    }

    return res;
  }

  /**
   * Method to validate the transfer of a pass
   * @param passId - The pass Id
   * @param currentUserId - The user id that ordered the pass
   * @param toUserId - The userId to whom the pass must be transferred
   * @returns If the pass is transferrable or not
   */
  async transferPassValidation(
    passId: string,
    toUserId: string,
    currentUserId: string,
    pass: Passes,
  ): Promise<boolean> {
    // Check if the pass is already not activated, already not transferred and if its not cancelled and not expired
    if (this.checkPassValidity(pass, currentUserId, toUserId)) {
      return !(await this.passIsActiveForUserSameDate(toUserId, pass.stageId, pass.reservedFor));
    }

    return false;
  }

  /**
   * Method to check if the pass is active for same stage and same date
   * @param toUserId
   * @param stageId
   * @param reservedFor
   * @returns if the pass is available or not
   */
  async passIsActiveForUserSameDate(
    toUserId: string,
    stageId: string,
    reservedFor: Date,
  ): Promise<boolean> {
    const activePass = await this.prisma.passes.findFirst({
      where: {
        userId: toUserId,
        activated: true,
        stageId: stageId,
        reservedFor: moment(reservedFor).toISOString(),
      },
    });
    return Boolean(activePass?.activated);
  }

  /**
   * Method to check if the pass is available
   * @param pass - The pass Data
   * @param currentUserId - The owners userID
   * @param toUserId- The other user id
   * @returns if the pass is available or not
   */
  isPassAvailable(pass: Passes, currentUserId: string, toUserId: string): boolean {
    return (
      !pass.activated && !pass.isTransferred && !pass.isCancelled && toUserId !== currentUserId
    );
  }

  /**
   * Method to check if the pass is not expired
   * @param reservedFor - The date that the pass is reserved for
   * @returns if the pass is expired or not
   */
  isPassExpired(reservedFor: Date, expiredAt: Date | null = null): boolean {
    const currentDate = moment().format(DATE_FORMATS.YYYYMMDD);

    const daysFromReserved = expiredAt ? moment(expiredAt) : moment(reservedFor).endOf('day');
    return moment(currentDate).isAfter(daysFromReserved);
  }

  canPassAmendOrCancel(currentPassDate: Date) {
    const currentDate = moment().format(DATE_FORMATS.YYYYMMDDHHMMSS);
    const daysFromReserved = moment(currentPassDate)
      .subtract(PASS_AMEND_EXPIRY_PERIOD, 'hours')
      .format(DATE_FORMATS.YYYYMMDDHHMMSS);
    return moment(currentDate).isBefore(daysFromReserved);
  }

  reResevingForSameDate(currentPassDate: Date, reservingDate: Date) {
    return moment(currentPassDate).isSame(reservingDate);
  }

  /**
   * Method to check teh validity of the pass
   * @param pass - The pass Data
   * @param currentUserId - The owners userID
   * @param toUserId- The other user id
   * @returns if the pass is valid or not
   */
  checkPassValidity(pass: Passes, currentUserId: string, toUserId: string): boolean {
    return (
      this.isPassAvailable(pass, currentUserId, toUserId) &&
      !this.isPassExpired(pass.reservedFor, pass.expiredAt)
    );
  }

  /**
   * Method to change the pass to another user
   * @param passId - The pass Id
   * @param userId - user id to which pass needs to be transferred
   * @param fromUserId - user id of the user who tries to transfer the pass
   * @returns Updated pass data
   */

  async transferPass(
    passId: string,
    toUserId: string,
  ): Promise<PassesEntity | (PassesEntity & UserTrailTracking)> {
    const pass = await this.prisma.passes.findUnique({
      where: {
        id: passId,
      },
    });

    let updatedUserTrailTracking: UserTrailTracking;

    const userTrailTracking = await this.prisma.userTrailTracking.findFirst({
      where: {
        userId: pass.userId,
        passesId: pass.id,
      },
    });
    const isValid = await this.transferPassValidation(passId, toUserId, pass.userId, pass);
    const resetTrailTrackingBody = {
      averagePace: 0.0,
      averageSpeed: 0.0,
      completion: 0.0,
      distanceTraveled: 0.0,
      elevationGain: 0.0,
      elevationLoss: 0.0,
      isCompleted: false,
      totalTime: 0.0,
    };

    if (!isValid) throw new BadRequestException('Invalid pass transfer request');

    try {
      const updatedPass = await this.prisma.$transaction(async (tx) => {
        const updatedPass = await tx.passes.update({
          where: {
            id: passId,
          },
          data: {
            userId: toUserId,
            activated: true,
            isTransferred: true,
          },
        });

        // Assumption: When transferring pass from User A to User B on a progress trail User A's gps data and statistics will transferred to User B based on condition User B also trailing with User A in parallel.

        // When transferring a not active pass to another while on trail, Pass will be transfer from User A to B. And current trail track & track history UserId's will be updated based on Pass Id
        if (userTrailTracking) {
          updatedUserTrailTracking = await tx.userTrailTracking.update({
            where: {
              userId: pass.userId,
              passesId: pass.id,
            },
            data: {
              ...resetTrailTrackingBody,
              userId: toUserId,
            },
          });
        }
        return updatedPass;
      });

      // since the prisma transaction timeout limit(5000ms). There can be thousands gps of records to update. Because of that prisma bulk update api removed from transaction
      // Note: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance#using-bulk-queries
      if (userTrailTracking) {
        await this.prisma.userTrailTrackingHistory.updateMany({
          where: {
            userId: pass.userId,
            passesId: pass.id,
          },
          data: {
            userId: toUserId,
          },
        });
      }

      return { ...updatedPass, ...updatedUserTrailTracking };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'passes' }, level: 'error' });
      throw new InternalServerErrorException('Something went wrong trying to transfer the pass');
    }
  }

  /**
   * Method to create passes batch wise
   * @param passesData - Array of the passes with the necessary fields
   * @returns Updated pass data
   */
  async createPasses(passesData: Array<PassesEntity>): Promise<BulkPassCreate> {
    try {
      const res = await this.prisma.passes.createMany({
        data: passesData,
      });
      return res;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'passes' }, level: 'error' });
      throw new InternalServerErrorException('Something went wrong while creating multiple passes');
    }
  }

  /**
   * Method to get my trails (can be either scheduled trails or past trails)
   * @param userId - The user Id
   * @param getPassDto -  The get pass dto which includes all quey params
   * @returns The users trails
   */
  async getMyTrails(userId: string, getPassDto: GetPassDto) {
    const { pageNumber, perPage, type } = getPassDto;

    const paginate: PaginateFunction = paginator({
      page: pageNumber,
      perPage: perPage,
    });

    let query: DateQueryDto;

    switch (type) {
      case PassType.ACTIVE:
        throw new UnprocessableEntityException(
          'Invalid pass date status, should be either expired or reserved',
        );
      case PassType.EXPIRED:
        query = this.passFilterWhereClause(PassType.EXPIRED);
        return await this.getPastTrail(paginate, userId, query, pageNumber);
      case PassType.RESERVED:
        // below query needs to filter passes that are booked for today + future dates that are not expired yet
        const currentDate: Date = new Date();
        query = {
          startDate: {
            gte: currentDate, // Check if reservedFor is greater than the current date including current date/moment
          },
          endDate: {
            gte: currentDate, // Check if expiredAt is greater than the current moment
          },
        };
        return await this.getScheduledTrails(paginate, query, userId, pageNumber);
    }
  }

  /**
   * Method to query the Db and get scheduled trails
   * @param paginate - The common function that is used for pagination
   * @param query -  The query which determines the filter for the reservedFor date
   * @param userId - The relevant userId
   * @param page - The relevant page needed
   * @returns All scheduled trails
   */
  async getScheduledTrails(
    paginate: PaginateFunction,
    query: DateQueryDto,
    userId: string,
    page: number,
  ) {
    const res: PaginatedResult<PassOrdersAggregate> = await paginate(
      this.prisma.passOrdersAggregateView,
      {
        where: {
          userId: userId,
          reservedFor: query.startDate,
          expiredAt: query.endDate,
        },
        orderBy: {
          reservedFor: 'asc',
        },
      },
      {
        page: page,
      },
    );

    for (const i of res.data) {
      const response = await this.prisma.stage.findUnique({
        where: {
          id: i.stageId,
        },
        select: {
          number: true,
          difficultyType: true,
          cumulativeReviews: true,
          reviewsCount: true,
          stagesTranslation: {
            select: {
              stageHead: true,
              stageTail: true,
              localeId: true,
            },
          },
          stageMedia: {
            where: {
              mediaType: $Enums.STAGE_MEDIA_KEY_TYPES.MAIN_IMAGE,
            },
            select: {
              mediaKey: true,
            },
          },
        },
      });
      i.stageData = response as Partial<StageData>;
    }

    return res;
  }

  /**
   * Method to query the Db and get all users past trails
   * @param paginate - The common function that is used for pagination
   * @param query -  The query which determines the filter for the reservedFor date
   * @param userId - The relevant userId
   * @param page - The relevant page needed
   * @returns All scheduled trails
   */
  async getPastTrail(
    paginate: PaginateFunction,
    userId: string,
    query: DateQueryDto,
    page: number,
  ) {
    /**
     * @description Get the posts of the user where reservation is for a previous date.
     * Then, select only the required fields from the stage table, and from the stage,
     * select the awarded badge for the relevant user.
     */
    return await paginate(
      this.prisma.passes,
      {
        where: {
          userId: userId,
          reservedFor: query.startDate,
          expiredAt: query.endDate,
        },
        select: {
          reservedFor: true,
          id: true,
          stage: {
            select: {
              difficultyType: true,
              number: true,
              cumulativeReviews: true,
              reviewsCount: true,
              userAwardedBadges: {
                where: {
                  userId: userId,
                },
                select: {
                  badge: {
                    select: { badgeKey: true },
                  },
                },
              },
              stageMedia: {
                where: {
                  mediaType: $Enums.STAGE_MEDIA_KEY_TYPES.MAIN_IMAGE,
                  type: $Enums.STAGE_MEDIA_TYPES.PHOTO,
                },
                select: {
                  mediaKey: true,
                },
              },
              stagesTranslation: {
                select: {
                  stageHead: true,
                  stageTail: true,
                  localeId: true,
                },
              },
            },
          },
        },
      },
      {
        page: page,
      },
    );
  }

  /**
   * Method to soft delete pass
   * @param id - pass id needs to be soft deleted
   * @returns Updated pass data
   */
  async softDeletePass(id: string, userId: string): Promise<PassesEntity[]> {
    try {
      const pass = await this.prisma.passes.findUnique({ where: { id } });

      const stage = await this.prisma.stage.findFirst({
        where: { id: pass.stageId },
        include: {
          stagesTranslation: {
            where: { localeId: 'en' },
          },
        },
      });

      const passUser = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

      const mailOptions: nodemailer.SendMailOptions = {
        to: passUser.email,
        subject: `${MAIL_FROM} - Order cancellation`,
      };

      const orderDetails = await this.prisma.orders.findUnique({
        where: { id: pass.orderId },
        include: {
          passes: {
            where: {
              type: {
                in: [PASS_TYPE.ADULT, PASS_TYPE.CHILD],
              },
            },
          },
        },
      });

      const adultCount = orderDetails.passes.filter((pass) => pass.type === PASS_TYPE.ADULT).length;
      const childCount = orderDetails.passes.filter((pass) => pass.type === PASS_TYPE.CHILD).length;

      const stageOpenTime = moment.utc(stage.openTime, 'HH:mm:ss');

      const reserveTime = moment
        .utc(pass.reservedFor)
        .add(stageOpenTime.hours(), 'hours')
        .add(stageOpenTime.minutes(), 'minutes')
        .format(DATE_FORMATS.YYYYMMDDHHMMSS);

      if (!this.canPassAmendOrCancel(new Date(reserveTime))) {
        throw new BadRequestException(
          `Passes can only be cancelled ${PASS_AMEND_EXPIRY_PERIOD} hours before the stage start time`,
        );
      }

      if (pass.userId != userId) {
        throw new NotFoundException('Pass not found for the user');
      }

      await this.prisma.passes.updateMany({
        where: { orderId: pass.orderId },
        data: { isCancelled: true, cancelledAt: new Date() },
      });

      const templateVars = {
        firstName: passUser.firstName,
        lastName: passUser.lastName,
        adultCount,
        childCount,
        bookingDate: moment(pass.reservedFor).format('Do MMMM YYYY'),
        total: adultCount + childCount,
        cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
        stageNumber: stage.number,
        stageHead: stage.stagesTranslation[0].stageHead,
        stageTail: stage.stagesTranslation[0].stageTail,
      };

      await this.sendEmailQueuePasses.add(
        {
          mailOptions,
          templateName: EMAIL_TEMPLATES.PASS_CANCELLATION,
          templateVars,
        },
        { attempts: 20, backoff: 900000 },
      );

      return await this.prisma.passes.findMany({
        where: { orderId: pass.orderId },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'passes' }, level: 'error' });
      throw new InternalServerErrorException(
        error.message ? error.message : 'Something went wrong while deleting the pass',
      );
    }
  }

  async getPassCountForUserByStageAndByDate(stageId: string, userId: string, reservedFor: Date) {
    const previousPasses = await this.prisma.passOrdersAggregateView.aggregate({
      where: {
        userId,
        stageId,
        reservedFor,
      },
      _sum: {
        passCount: true,
      },
    });
    return previousPasses;
  }

  async amendPass(
    orderId: string,
    toDate: Date,
    toStage: string,
    userId: string,
  ): Promise<Passes[] | void> {
    try {
      let updatedPass: Passes[];

      const unAllocatedPasses = await this.prisma.passes.findMany({
        where: {
          orderId: orderId,
          isTransferred: false,
          isCancelled: false,
          userId: userId,
        },
      });

      if (!unAllocatedPasses.length) {
        throw new BadRequestException('Transferred passes cannot be rescheduled.');
      }

      const passInventoryData = await this.prisma.passInventoryAggregateView.findFirst({
        where: { stage_id: toStage, date: toDate },
      });

      if (passInventoryData) {
        const remainingPasses =
          passInventoryData.inventoryQuantity - passInventoryData.reservedQuantity;

        if (remainingPasses >= unAllocatedPasses.length) {
          updatedPass = await Promise.all(
            unAllocatedPasses.map(async (pass) => {
              const stage = await this.prisma.stage.findFirst({
                where: { id: pass.stageId },
              });

              const stageOpenTime = moment.utc(stage.openTime, 'HH:mm:ss');

              const reserveTime = moment
                .utc(pass.reservedFor)
                .add(stageOpenTime.hours(), 'hours')
                .add(stageOpenTime.minutes(), 'minutes')
                .format(DATE_FORMATS.YYYYMMDDHHMMSS);

              if (
                !this.reResevingForSameDate(new Date(pass.reservedFor), new Date(toDate)) &&
                this.canPassAmendOrCancel(new Date(reserveTime)) &&
                !this.isPassExpired(pass.reservedFor) &&
                !pass.isCancelled &&
                !pass.isTransferred
              ) {
                return await this.prisma.passes.update({
                  where: { id: pass.id },
                  data: { reservedFor: toDate, stageId: toStage },
                });
              } else {
                throw new BadRequestException(
                  'Rescheduled failed, Passes can be rescheduled either before 12 hours of the stage starting time or to a new stage with a new date',
                );
              }
            }),
          );
        } else {
          throw new BadRequestException('Not enough passes available for the given date');
        }
      } else {
        throw new NotFoundException('Pass inventory not found');
      }
      return updatedPass;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'passes' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async getStageWiseSummaryReport(
    stageId: string,
    reservedFor: string,
  ): Promise<StageWiseSummaryReportDto[]> {
    const date = new Date(reservedFor).toISOString();

    const passesWithDateDetails = await this.prisma.$queryRaw<StageWiseSummaryReportDto[]>`SELECT
    DATE(o.created_at) AS "bookingDate",
    jsonb_build_object(
       'id', u.id,
       'firstName', u.first_name,
       'lastName', u.last_name,
       'nationalityCode', u.nationality_code
     ) as "user",
    p.stage_id AS "stageId",
    p.reserved_for AS "reservedFor",
    SUM (p.pass_count)::int AS "passCount"
    FROM
    pass_orders_aggregate_view AS p
    JOIN
    orders AS o ON p.order_id = o.id
    JOIN
    users AS u ON p.user_id = u.id
    WHERE
    p.stage_id = ${stageId}::uuid
    AND p.reserved_for = ${date}::date
    GROUP BY DATE(o.created_at), u.id, p.stage_id, p.reserved_for
    `;

    return passesWithDateDetails;
  }

  /**
   * Method to get the active passes of a user
   * @param userId - The user Id
   * @param stageId - The stage Id
   * @returns The active pass of the user
   **/
  async getUserActivePassByStageId(userId: string, stageId: string): Promise<UserActivePass> {
    try {
      // Check if the stage exists
      const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });

      if (!stage) {
        throw new NotFoundException('Stage not found');
      }

      const userActivePasses = await this.prisma.passes.findMany({
        where: {
          userId,
          stageId,
          activated: true,
          isCancelled: false,
          reservedFor: new Date().toISOString(),
        },
        include: {
          userTrailTracking: true,
        },
      });

      if (!userActivePasses || userActivePasses.length === 0) {
        return {} as UserActivePass;
      }

      const activePass = userActivePasses.find((pass) => {
        if (pass.userTrailTracking) {
          return !pass.userTrailTracking.isCompleted;
        }
        return true;
      });

      if (!activePass) {
        return {} as UserActivePass;
      }

      return {
        ...activePass,
        passValidityPeriod: PASS_VALIDITY_PERIOD,
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'passes' }, level: 'error' });
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getCancelledPassesReport(
    stageId: string,
    reservedFor: string,
  ): Promise<CancelledPassDto[]> {
    const date = new Date(reservedFor).toISOString();

    const passes = await this.prisma.$queryRaw<CancelledPassDto[]>`SELECT
    DATE(passes.cancelled_at) as "cancelledDate",
    COUNT(*)::int as "passesCount",
    jsonb_build_object(
      'id', users.id,
      'firstName', users.first_name,
      'lastName', users.last_name,
      'nationalityCode', users.nationality_code
      ) as "user"
    FROM passes
    JOIN users ON passes.user_id = users.id
    WHERE
      passes.stage_id = ${stageId}::uuid
      AND passes.reserved_for = ${date}::date
      AND passes.is_cancelled = true
    GROUP BY DATE(passes.cancelled_at), users.id
    `;
    return passes;
  }

  async getAllPassesUserIdByStage(stageId: string, cursor: number): Promise<NoticeOrderDto[]> {
    try {
      const passes = await this.prisma.passes.findMany({
        distinct: ['userId'],
        where: {
          stageId: stageId,
          isCancelled: false,
          order: {
            status: $Enums.ORDER_STATUS.ACTIVE,
          },
          user: {
            registrationStatus: $Enums.REGISTRATION_STATUS.COMPLETE,
            role_id: { not: RoleType.Banned },
          },
        },
        select: {
          userId: true,
        },
        skip: cursor,
        take: NOTICE_QUEUE_BATCH_SIZE,
        orderBy: {
          orderId: 'asc',
        },
      });
      return passes;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
