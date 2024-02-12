import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PASS_VALIDITY_PERIOD, TRAIL_COMPLETION_PERCENTAGE } from '@common/constants';
import moment from 'moment';
import { PassesEntity } from '../passes/dto';
import { StageDatabaseDto } from '../stage/dto/stage-database.dto';
import { CreateUserTrailTrackingDto } from './dto/create-user-trail-tracking.dto';
import { convertStageDatabaseToResponse } from '@common/helpers/stage-response-converter';
import { UserTrailTrackingDto } from './dto/get-user-trail-tracking.dto';
import { Passes, UserTrailTracking } from '@prisma/client';
import { UserTrailTrackingResponse } from './dto/create-user-trail-response.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class UserTrailTrackingService {
  constructor(private prisma: PrismaService) {}

  private calculatePassExpiration(startTime: Date) {
    return moment(startTime).add(PASS_VALIDITY_PERIOD, 'hours').toISOString();
  }

  private async validateData(
    userTrackData: CreateUserTrailTrackingDto,
    userId: string,
    passDetails: PassesEntity & { stage: StageDatabaseDto },
    previousUserTrailData: CreateUserTrailTrackingDto = null,
  ) {
    const formattedReservedDate = moment(passDetails.reservedFor).format('MMM DD YYYY');
    const openTime = moment(
      formattedReservedDate + ' ' + moment(passDetails.stage.openTime).format('HH:mm:ss'),
      'MMM DD YYYY HH:mm:ss',
    );

    const closeTime = moment(
      formattedReservedDate + ' ' + moment(passDetails.stage.closeTime).format('HH:mm:ss'),
      'MMM DD YYYY HH:mm:ss',
    );
    const trackingStartTime = moment(userTrackData.startTime);

    const trailStartTimeIsValid = trackingStartTime.isBetween(openTime, closeTime);

    // check if the trail start time is between open & close time range within the reserved date
    if (!trailStartTimeIsValid) {
      throw new BadRequestException(
        'Trail start time should be within the reserved date stage open & close time range',
      );
    }

    if (passDetails.isCancelled || passDetails.userId !== userId || !passDetails.activated) {
      throw new BadRequestException('Pass is not valid');
    }
    // check if pass is expired & if expired update isActive track to false
    if (passDetails.expiredAt) {
      let passExpiredAt = moment(passDetails.expiredAt);

      // If there is no previousUserTrailData & trail startTime is valid then check expiry from extended pass validity period(36 hours from startTime)
      // This helps for validate offline sync data coming from mobile end
      if (!previousUserTrailData) {
        passExpiredAt = moment(this.calculatePassExpiration(userTrackData.startTime));
      }

      const trackingDataTimestamp = moment(userTrackData.timestamp);

      const trackingDataTimestampIsNotValid = trackingDataTimestamp.isAfter(passExpiredAt);

      if (trackingDataTimestampIsNotValid) {
        if (previousUserTrailData?.isActiveTrack) {
          await this.prisma.userTrailTracking.update({
            where: {
              userId: userId,
              passesId: userTrackData.passesId,
            },
            data: { ...previousUserTrailData, isActiveTrack: false },
          });
        }
        throw new BadRequestException('Tracking data is not valid');
      }
    }

    // Check if already completed the trail manually
    if (previousUserTrailData?.isCompleted) {
      throw new BadRequestException('Trail is already completed');
    }
  }

  private async getPassDetails(passesId: string) {
    return await this.prisma.passes.findFirst({
      where: { id: passesId },
      include: { stage: true, order: true },
    });
  }

  private async getPreviousUserTrailData(userId: string, passesId: string) {
    return await this.prisma.userTrailTracking.findFirst({
      where: {
        userId,
        passesId,
        passes: { activated: true },
      },
    });
  }

  private calculateCompletion(
    userTrackData: CreateUserTrailTrackingDto,
    previousUserTrailData: UserTrailTracking | null,
  ) {
    return previousUserTrailData && previousUserTrailData.completion > userTrackData.completion
      ? previousUserTrailData.completion
      : userTrackData.completion;
  }

  private formatData(
    userTrackData: CreateUserTrailTrackingDto,
    userId: string,
    completion: number,
    pass: Passes,
    previousUserTrailData: UserTrailTracking,
  ) {
    return {
      ...userTrackData,
      userId,
      completion, // Trail completion progress percentage
      passesId: pass.id,
      isActiveTrack: userTrackData?.isCompleted ? false : pass.activated, // Logged in user's active trail
      startTime: previousUserTrailData?.startTime
        ? previousUserTrailData?.startTime
        : userTrackData.startTime,
      isCompleted: userTrackData?.isCompleted ? userTrackData?.isCompleted : false, // User manually completed the trail or not
    };
  }

  private async updateTrack(
    completion: number,
    passesAllocatedForUser: Passes[],
    activeTracks: UserTrailTracking[],
    previousUserTrailData: UserTrailTracking,
    passDetails: Passes,
    userId: string,
    userTrackData: CreateUserTrailTrackingDto,
  ): Promise<UserTrailTrackingResponse> {
    let responseData: UserTrailTrackingResponse;

    await this.prisma.$transaction(async (tx) => {
      if (activeTracks && activeTracks.length > 0) {
        await Promise.all(
          activeTracks.map(async (track) => {
            await this.prisma.userTrailTracking.update({
              where: {
                userId: userId,
                passesId: track.passesId,
              },
              data: { ...track, isActiveTrack: false },
            });
          }),
        );
      }

      for (const pass of passesAllocatedForUser) {
        const formattedData = this.formatData(
          userTrackData,
          userId,
          completion,
          pass,
          previousUserTrailData,
        );
        const userTrailData = await tx.userTrailTracking.upsert({
          where: {
            userId_passesId: {
              userId: userId,
              passesId: pass.id,
            },
          },
          create: formattedData,
          update: formattedData,
        });

        delete formattedData.isActiveTrack;

        await tx.userTrailTrackingHistory.create({
          data: formattedData,
        });

        let updatedPassData = pass;

        if (!previousUserTrailData) {
          updatedPassData = await tx.passes.update({
            data: {
              expiredAt: this.calculatePassExpiration(userTrackData.startTime),
            },
            where: { id: pass.id },
          });
        }

        if (userTrackData.isCompleted) {
          updatedPassData = await tx.passes.update({
            data: {
              expiredAt: userTrackData.timestamp,
            },
            where: { id: pass.id },
          });
        }

        if (pass.activated) {
          responseData = { ...userTrailData, passes: updatedPassData };
        }
      }

      const completionIs100Percent = Math.trunc(completion) === TRAIL_COMPLETION_PERCENTAGE;
      const previousCompletionIs100Percent =
        Math.trunc(previousUserTrailData?.completion) === TRAIL_COMPLETION_PERCENTAGE;

      if (completionIs100Percent && !previousCompletionIs100Percent) {
        const badge = await tx.badge.findFirst({ where: { stageId: passDetails.stageId } });
        if (badge) {
          await tx.userAwardedBadge.create({
            data: {
              badgeId: badge.id,
              userId,
              stageId: badge.stageId,
              passId: passDetails.id,
            },
          });
        }
      }
    });

    return responseData;
  }

  /**
   * Update user's ongoing trails
   * @param userTrackData - CreateUserTrailTrackingDto
   * @param userId - User Id of the logged in user
   * @returns return updated track data
   */
  async updateUserTrack(
    userTrackData: CreateUserTrailTrackingDto,
    userId: string,
  ): Promise<UserTrailTrackingResponse> {
    try {
      const passDetails = await this.getPassDetails(userTrackData.passesId);

      const previousUserTrailData = await this.getPreviousUserTrailData(
        userId,
        userTrackData.passesId,
      );

      await this.validateData(userTrackData, userId, passDetails, previousUserTrailData);

      const completion = this.calculateCompletion(userTrackData, previousUserTrailData);

      const passesAllocatedForUser = await this.prisma.passes.findMany({
        where: {
          orderId: passDetails.order.id,
          userId: userId,
        },
      });

      const activeTracks = await this.prisma.userTrailTracking.findMany({
        where: {
          userId: userId,
          isActiveTrack: true,
          passesId: {
            not: userTrackData.passesId,
          },
        },
      });

      return await this.updateTrack(
        completion,
        passesAllocatedForUser,
        activeTracks,
        previousUserTrailData,
        passDetails,
        userId,
        userTrackData,
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'user-trail-tracking' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('User trail tracking Update Failed');
    }
  }

  /**
   * GET user's ongoing trails
   * @param userId - User Id of the logged in user
   * @returns return current track data if exists
   */

  async getUserOngoingTrack(userId: string): Promise<UserTrailTrackingDto> {
    try {
      const currentDate = new Date();
      const response = await this.prisma.userTrailTracking.findFirst({
        where: {
          userId,
          isActiveTrack: true,
          passes: {
            activated: true,
            reservedFor: {
              lte: currentDate,
            },
            expiredAt: {
              gt: currentDate,
            },
          },
        },
        include: {
          passes: {
            include: {
              stage: {
                include: {
                  stagesTranslation: true,
                },
              },
            },
          },
        },
      });

      if (!response) {
        throw new BadRequestException('The user is not currently engaged in a trail');
      }

      const stageToDto = convertStageDatabaseToResponse(response.passes.stage, false);

      const responseData = { ...response, passes: { ...response.passes, stage: stageToDto } };

      return responseData;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'user-trail-tracking' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something went wrong while fetching tracking data');
    }
  }
}
