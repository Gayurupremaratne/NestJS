import {
  CONFIG_NAMESPACES,
  EMAIL_TEMPLATES,
  MAIL_FROM,
  PASS_USER_TYPE,
  PASS_USER_TYPE_CODE,
  QUEUES,
} from '@common/constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { generatePassId } from '@common/helpers/generate-passId.helper';
import { parseSortOrder } from '@common/helpers/parse-sort';
import { IAppConfig } from '@common/types';
import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma-orm/prisma.service';
import { ORDER_STATUS } from '@prisma/client';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import moment from 'moment';
import * as nodemailer from 'nodemailer';
import { PassInventoryService } from '../pass-inventory/pass-inventory.service';
import { PassOrdersAggregate } from '../passes/dto';
import { PassesService } from '../passes/passes.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersByStageQuery } from './dto/get-order.dto';
import * as Sentry from '@sentry/node';
import { OrderEligibilityQuery, OrderEligibilityResponse } from './dto/order-eligibility-dto';

@Injectable()
export class OrderRepository {
  constructor(
    private prisma: PrismaService,
    private passService: PassesService,
    private passInventoryService: PassInventoryService,
    private configService: ConfigService,
    @InjectQueue(QUEUES.MAIL) private readonly sendEmailQueueOrder: Queue,
  ) {}

  private validatePass(requestedPassTotal: number, adultCount: number, childrenCount: number) {
    // check whether at least one pass is requested
    if (adultCount < 1 && childrenCount < 1) {
      throw new BadRequestException('At least 1 pass needs to be requested');
    }

    // check whether more than 5 passes is requested
    if (requestedPassTotal > 5) {
      throw new BadRequestException("Can't request more than 5 per time");
    }
  }
  // This function checks if a user is eligible to book passes.
  // Scenario 1 - User cannot book passes if there's an order for the same reserve date, same stage and same user
  // Scenario 2 - User cannot book passes if there's no order for the reserve date but there's a trail tracking record(timestamp) for same reserve date, same stage, and same user. (extended passes)
  async checkOrderEligibility(
    query: OrderEligibilityQuery,
    userId: string,
  ): Promise<OrderEligibilityResponse> {
    const { stageId, reservedDate } = query;

    const order = await this.prisma.orders.findFirst({
      where: {
        userId: userId,
        stageId: stageId,
        reservedFor: moment(reservedDate).toISOString(),
      },
      include: {
        passes: {
          include: {
            userTrailTracking: true,
          },
        },
      },
    });

    // (Scenario 1)
    if (order && order.passes.length > 0) {
      throw new BadRequestException(
        `You cannot book passes for this stage till the end of ${moment(reservedDate).format(
          'DD-MM-YYYY',
        )}`,
      );
    } else {
      const userTrailTracking = await this.prisma.userTrailTracking.findFirst({
        where: {
          userId: userId,
          passes: {
            stageId: stageId,
          },
          timestamp: {
            gt: moment(reservedDate, 'day').toDate(),
          },
        },
      });

      // (Scenario 2)
      if (userTrailTracking) {
        throw new BadRequestException(
          `You cannot book passes for this stage till the end of ${moment(reservedDate).format(
            'DD-MM-YYYY',
          )}`,
        );
      }
    }

    return { stageId: stageId, reservedDate: reservedDate, isEligible: true };
  }

  async createOrder(data: CreateOrderDto, userId: string) {
    // remove unnecessary inputs and use default ones
    const { stageId, reservedFor, passCount } = data;
    const { adults: adultCount, children: childrenCount } = passCount;
    const requestedPassTotal = adultCount + childrenCount;
    const min = 100000;
    const max = 999999;

    const randomArray = await this.generateRandomArray(
      min,
      max,
      requestedPassTotal,
      userId,
      reservedFor,
    );

    const adultRandomIdArray = randomArray.slice(0, adultCount);
    const childRandomIdArray = randomArray.slice(adultCount, requestedPassTotal);

    const passNumbersArray = [];
    let passNumber = 1;
    let templateVars;
    let mailOptions: nodemailer.SendMailOptions;

    await this.checkOrderEligibility({ stageId: stageId, reservedDate: reservedFor }, userId);

    this.validatePass(requestedPassTotal, adultCount, childrenCount);

    const passInventory = await this.passInventoryService.findPassInventoryByDate(
      stageId,
      reservedFor,
    );
    const remainingInventory =
      passInventory?.inventoryQuantity - passInventory?.reservedQuantity || 0;

    // inventory check
    if (remainingInventory < requestedPassTotal) {
      throw new BadRequestException('Available passes not enough to complete the order');
    }

    const previousPasses = await this.passService.getPassCountForUserByStageAndByDate(
      stageId,
      userId,
      reservedFor,
    );

    // check whether user have already purchased more than the allowed per day for the given stage
    if (previousPasses._sum.passCount + requestedPassTotal > 5) {
      throw new BadRequestException('Number of passes exceeded the daily allowed amount');
    }

    let createdOrder;

    await this.prisma.$transaction(async (prismaTransaction) => {
      // create the order
      createdOrder = await prismaTransaction.orders.create({
        data: {
          userId,
          stageId,
          reservedFor,
          isRescheduled: false,
        },
        include: {
          stage: true,
        },
      });
      // check if there is any active pass for the same stage and same reserved date
      const haveActivePass = await this.passService.passIsActiveForUserSameDate(
        userId,
        stageId,
        reservedFor,
      );

      // ordering stage
      const orderingStage = await prismaTransaction.stage.findUnique({
        where: { id: stageId },
        include: { stagesTranslation: { where: { localeId: 'en' } } },
      });

      // construct pass objects
      const passesToCreate = [];
      for (let i = 0; i < adultCount; i++) {
        passesToCreate.push({
          stageId,
          userId,
          orderId: createdOrder.id,
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT],
          reservedFor: moment(reservedFor).toISOString(),
          activated: haveActivePass ? false : i === 0,
          isCancelled: false,
          isTransferred: false,
          expiredAt: moment(moment(reservedFor)).endOf('day').toISOString(), // The default expiry(end of the reserved date) set to the passes. Expiry will extend according to validity period defined when user start the trail
          passId: adultRandomIdArray[i],
        });

        const obj = {
          passNo: passNumber++,
          passId: generatePassId(orderingStage.number, reservedFor, adultRandomIdArray[i]),
        };

        passNumbersArray.push(obj);
      }

      for (let i = 0; i < childrenCount; i++) {
        passesToCreate.push({
          stageId,
          userId,
          orderId: createdOrder.id,
          type: PASS_USER_TYPE[PASS_USER_TYPE_CODE.CHILD],
          reservedFor: moment(reservedFor).toISOString(),
          activated: haveActivePass ? false : adultCount < 1 && i === 0,
          isCancelled: false,
          isTransferred: false,
          expiredAt: moment(moment(reservedFor)).endOf('day').toISOString(), // The default expiry(end of the reserved date) set to the passes. Expiry will extend according to validity period defined when user start the trail
          passId: childRandomIdArray[i],
        });

        const obj = {
          passNo: passNumber++,
          passId: generatePassId(orderingStage.number, reservedFor, childRandomIdArray[i]),
        };

        passNumbersArray.push(obj);
      }

      // create passes
      await prismaTransaction.passes.createMany({
        data: passesToCreate,
      });

      //send email confirmation
      const orderingUser = await prismaTransaction.user.findUnique({ where: { id: userId } });

      mailOptions = {
        to: orderingUser.email,
        subject: `${MAIL_FROM} - Order confirmation`,
      };

      const passConditions = await prismaTransaction.passConditionTranslation.findMany({
        where: { localeId: 'en' },
        orderBy: { order: 'asc' },
      });

      const passConditionsOnlyContent = passConditions.flatMap((item) => {
        return item.content;
      });

      const totalPassCount = adultCount + childrenCount;

      // 4: Queue mail notification

      templateVars = {
        firstName: orderingUser.firstName,
        lastName: orderingUser.lastName,
        stageNumber: orderingStage.number.toString(),
        stageHead: orderingStage.stagesTranslation[0]?.stageHead,
        stageTail: orderingStage.stagesTranslation[0]?.stageTail,
        bookingDate: moment(reservedFor).format('Do MMMM YYYY'),
        adults: adultCount.toString(),
        children: childrenCount.toString(),
        total: totalPassCount.toString(),
        passConditionsOnlyContent,
        passNumbers: passNumbersArray,
        cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
        deeplink_view_passes: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)[
          'DEEPLINK_VIEW_PASSES'
        ],
      };
    });

    await this.sendEmailQueueOrder.add(
      {
        mailOptions,
        templateName: EMAIL_TEMPLATES.PASS_CONFIRMATION,
        templateVars,
      },
      { attempts: 20, backoff: 900000 },
    );

    return {
      ...createdOrder,
      reservedFor,
      passCount: {
        adults: adultCount,
        children: childrenCount,
      },
    };
  }

  async getOrdersByStage(stageId: string, query: GetOrdersByStageQuery) {
    const { pageNumber, perPage, date, sortBy } = query;

    try {
      const paginate: PaginateFunction = paginator({
        page: pageNumber,
        perPage: perPage,
      });

      const res: PaginatedResult<PassOrdersAggregate> = await paginate(
        this.prisma.passOrdersAggregateView,
        {
          where: {
            stageId,
            reservedFor: date,
          },
          include: {
            user: true,
          },
          orderBy: parseSortOrder(sortBy, 'PassOrdersAggregateView'),
        },
        {
          page: pageNumber,
        },
      );

      return res;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'order' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteOrder(orderId: string): Promise<string> {
    try {
      // check if there is any tracking record for the order
      const trailTracks = await this.prisma.userTrailTracking.findFirst({
        where: {
          passes: {
            order: {
              id: orderId,
            },
          },
        },
      });

      if (trailTracks) {
        throw new BadRequestException(
          'You cannot delete this order, it might have some passes with progress records.',
        );
      }

      // Check order is past from end of yesterday
      const orderData = await this.prisma.orders.findFirst({
        where: {
          id: orderId,
          reservedFor: {
            gt: moment().subtract(1, 'days').endOf('day').toDate(),
          },
        },
      });

      // Past order
      if (!orderData) {
        throw new BadRequestException('You cannot delete this record');
      }

      const order = await this.prisma.orders.delete({
        where: {
          id: orderId,
        },
      });

      return order.id;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'order' }, level: 'error' });
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something went wrong while deleting the order!');
    }
  }

  async cancelOrdersByUserId(userId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.orders.updateMany({
          where: {
            userId,
          },
          data: { status: ORDER_STATUS.CANCELLED },
        });

        await tx.passes.updateMany({
          where: {
            userId,
          },
          data: { isCancelled: true, cancelledAt: new Date(), activated: false },
        });
      });

      return await this.prisma.orders.findMany({ where: { userId } });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'order' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async generateRandomArray(
    min: number,
    max: number,
    length: number,
    userId: string,
    reservedFor: Date,
  ) {
    let randomArray = [];
    do {
      randomArray = Array.from({ length }, () => {
        return crypto.randomInt(min, max + 1);
      });
    } while (
      (await this.prisma.passes.count({
        where: { userId: userId, reservedFor: reservedFor, passId: { in: randomArray } },
      })) !== 0
    );

    return randomArray;
  }
}
