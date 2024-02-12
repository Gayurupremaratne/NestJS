import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
  HttpStatus,
} from '@nestjs/common';
import moment from 'moment';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchUpdatePassInventoryDto } from './dto/batch-update-pass-inventory';
import { CreatePassInventoryDto } from './dto/create-pass-inventory.dto';
import {
  PassInventoryAggregate,
  PassInventoryAggregateAllocation,
  PassInventoryAggregateDto,
  PassInventoryDto,
} from './dto/pass-inventory.dto';
import { ORDER_STATUS, Prisma, PrismaClient, StageClosure } from '@prisma/client';
import {
  MAIL_FROM,
  EMAIL_TEMPLATES,
  PASS_USER_TYPE,
  PASS_USER_TYPE_CODE,
  CONFIG_NAMESPACES,
} from '@common/constants';
import * as nodemailer from 'nodemailer';
import { MailService } from '../mail/mail.service';
import { PassSummaryResult } from './dto/pass-summary.dto';
import { generatePassId } from '@common/helpers/generate-passId.helper';
import { IAppConfig } from '@common/types';
import { ConfigService } from '@nestjs/config';
import { DefaultArgs } from '@prisma/client/runtime/library';
import * as Sentry from '@sentry/node';

type txType = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PassInventoryService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async findPassInventoryByMonth(
    stageId: string,
    month: number,
    year: number,
  ): Promise<PassInventoryAggregateDto> {
    const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
    const endDate = startDate.clone().endOf('month');

    const passInventories = await this.prisma.passInventoryAggregateView.findMany({
      where: {
        stage_id: stageId === 'All' ? {} : stageId,
        date: {
          gte: new Date(startDate.format('YYYY-MM-DD')),
          lte: new Date(endDate.format('YYYY-MM-DD')),
        },
      },
    });

    // Calculate total, allocated, and remaining inventory counts
    let totalInventory = 0;
    let allocatedInventory = 0;
    let remainingInventory = 0;
    let cancelledInventory = 0;

    for (const inventory of passInventories) {
      totalInventory += inventory.inventoryQuantity;
      allocatedInventory += inventory.reservedQuantity;
      cancelledInventory += inventory.cancelledQuantity;
    }

    remainingInventory = totalInventory - allocatedInventory;

    return {
      data: passInventories,
      analytics: {
        totalInventory,
        allocatedInventory,
        remainingInventory,
        cancelledInventory,
      },
    };
  }

  async findPassInventoryAllocationByMonth(
    stageId: string,
    month: number,
    year: number,
  ): Promise<PassInventoryAggregateAllocation[]> {
    const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
    const endDate = startDate.clone().endOf('month');

    const passInventories = await this.prisma.passInventoryAggregateView.findMany({
      where: {
        stage_id: stageId,
        date: {
          gte: new Date(startDate.format('YYYY-MM-DD')),
          lte: new Date(endDate.format('YYYY-MM-DD')),
        },
      },
    });

    const inventories = passInventories.map((inventory) => {
      return {
        date: inventory.date,
        inventoryQuantity: inventory.inventoryQuantity,
        reservedQuantity: inventory.reservedQuantity,
        allocatedQuantity: inventory.inventoryQuantity - inventory.reservedQuantity,
      };
    });

    return inventories;
  }

  async findPassInventoryReservationByDay(
    stageId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    count: number;
  }> {
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();

    const aggregations = await this.prisma.passOrdersAggregateView.aggregate({
      _sum: {
        passCount: true,
      },
      where: {
        stageId,
        reservedFor: {
          gte: start,
          lte: end,
        },
      },
    });

    return { count: aggregations._sum.passCount };
  }

  async findOne(id: string): Promise<PassInventoryDto> {
    const inventory = await this.prisma.passInventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException();
    }
    return inventory;
  }

  async create(data: CreatePassInventoryDto): Promise<PassInventoryDto> {
    if (data.quantity < 0) {
      throw new UnprocessableEntityException('Pass Inventory quantity cannot be negative');
    }
    try {
      return await this.prisma.passInventory.create({
        data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'pass-inventory' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new UnprocessableEntityException('Pass Inventory already exists');
        }
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async updateInventoriesByBatch(
    stageId: string,
    data: BatchUpdatePassInventoryDto,
  ): Promise<PassInventoryDto[]> {
    const { quantity, startDate, endDate } = data;
    if (quantity < 0) {
      throw new UnprocessableEntityException('Pass Inventory quantity cannot be negative');
    }

    // Calculate the number of days in the date range
    const days = moment(endDate).startOf('day').diff(moment(startDate).startOf('day'), 'days') + 1;

    const { updatedPassInventories, stageClosureArray, includesReservedPasses } =
      await this.updateInventories(days, startDate, stageId, quantity, data);

    if (stageClosureArray.length > 0) {
      await this.notifyStageClosure(stageClosureArray);
    }

    if (includesReservedPasses) {
      throw new HttpException(
        'Inventory has been updated according to the number of passes booked!',
        HttpStatus.PARTIAL_CONTENT,
      );
    }

    return updatedPassInventories;
  }

  private async updateInventories(
    days: number,
    startDate: Date,
    stageId: string,
    quantity: number,
    data: BatchUpdatePassInventoryDto,
  ) {
    const updatedPassInventories: PassInventoryDto[] = [];
    const stageClosureArray = [];
    let includesReservedPasses = false;

    const updateInventoryForDate = async (
      tx: txType,
      currentDate: Date,
      stageId: string,
      quantity: number,
    ) => {
      const existingInventory = await tx.passInventory.findFirst({
        where: {
          stageId,
          date: currentDate,
        },
      });

      if (existingInventory) {
        // check if there are any reserved passes for the current date
        // if the updating quantity is less than the reserved quantity,
        // make it to the reserved quantity
        const { updatedInventory, includesReservedPass } = await this.updateExistingInventory(
          tx,
          existingInventory,
          quantity,
          stageId,
          currentDate,
          data.stageClosure,
        );

        updatedPassInventories.push(updatedInventory);

        if (includesReservedPass) {
          includesReservedPasses = true;
        }
      } else if (quantity > 0) {
        // Create a new inventory only if quantity is greater than 0
        const newInventory = await tx.passInventory.create({
          data: {
            stageId,
            date: currentDate,
            quantity,
          },
        });
        updatedPassInventories.push(newInventory);
      }
    };

    const updateStageClosureArray = (currentDate: Date, data: StageClosure) => {
      let isAlreadyExists = false;

      stageClosureArray.forEach((closedStage) => {
        if (closedStage.closedDate === currentDate) {
          isAlreadyExists = true;
          closedStage.data.push(data);
        }
      });

      if (!isAlreadyExists) {
        stageClosureArray.push({
          stageId,
          closedDate: currentDate,
          data: [data],
        });
      }
    };

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        await updateInventoryForDate(tx, currentDate, stageId, quantity);

        if (quantity === 0 && data.stageClosure) {
          const stageClosure = await this.findOrCreateStageClosure(
            stageId,
            currentDate,
            data.stageClosureReason,
          );
          updateStageClosureArray(currentDate, stageClosure);
        }
      }
    });

    return { updatedPassInventories, stageClosureArray, includesReservedPasses };
  }

  async updateExistingInventory(
    tx: txType,
    existingInventory: PassInventoryDto,
    quantity: number,
    stageId: string,
    currentDate: Date,
    stageClosure: boolean,
  ) {
    // Check if there are any reserved passes for the current date
    const reservedPasses = await tx.passOrdersAggregateView.findMany({
      select: {
        passCount: true,
      },
      where: {
        stageId: stageId,
        reservedFor: currentDate,
      },
    });

    const reservedPassesCount = reservedPasses.reduce((acc, curr) => {
      return acc + curr.passCount;
    }, 0);

    const includesReservedPass = reservedPasses && quantity < reservedPassesCount;

    let newQuantity: number;

    if (stageClosure) {
      newQuantity = quantity;
    } else {
      newQuantity = includesReservedPass ? reservedPassesCount : quantity;
    }

    const updatedInventory = await tx.passInventory.update({
      where: { id: existingInventory.id },
      data: {
        quantity: newQuantity,
      },
    });

    return { updatedInventory, includesReservedPass };
  }

  private async findOrCreateStageClosure(
    stageId: string,
    currentDate: Date,
    stageClosureReason: string,
  ): Promise<StageClosure> {
    const previousStageClosureExist = await this.prisma.stageClosure.findFirst({
      where: {
        stageId,
        closedDate: currentDate,
      },
    });

    const stageClosureData = {
      stageId,
      closedDate: currentDate,
      reason: stageClosureReason,
    };

    if (previousStageClosureExist) {
      // Update existing stage closure
      return await this.prisma.stageClosure.update({
        where: { id: previousStageClosureExist.id },
        data: stageClosureData,
      });
    }

    // Create a new stage closure
    return await this.prisma.stageClosure.create({ data: stageClosureData });
  }

  async findPassInventoryByDate(stageId: string, date: Date): Promise<PassInventoryAggregate> {
    const passInventory = await this.prisma.passInventoryAggregateView.findFirst({
      where: {
        stage_id: stageId,
        date,
      },
    });
    return passInventory;
  }

  async notifyStageClosure(
    stageClosureArray: { stageId: string; closedDate: Date; data: StageClosure[] }[],
  ): Promise<void> {
    await Promise.all(
      stageClosureArray.map(async (closedDay) => {
        const closedDate = new Date(closedDay.closedDate).toISOString();

        const passesSummaryDetails = await this.prisma.$queryRaw<PassSummaryResult[]>`SELECT
        passes.user_id as "userId",
        orders.id as "orderId",
        orders.created_at as "orderedDate",
        passes. "type" as "passType",
        CAST(COUNT(passes.id) AS INTEGER) AS "passQuantity",
        stage_translations.stage_tail as "stageTail",
        stage_translations.stage_head as "stageHead",
        stages. "number" as "stageNumber"
      FROM
        orders
        INNER JOIN passes ON passes.order_id = orders.id
        INNER JOIN stages ON stages.id = passes.stage_id
        LEFT JOIN stage_translations ON stage_translations.stage_id = stages.id
          AND stage_translations.locale_id = 'en'
      WHERE
        orders.status = 'ACTIVE'
        AND orders.reserved_for = ${closedDate}::date
        AND orders.stage_id = ${closedDay.stageId}::uuid
        AND passes.is_cancelled = FALSE
      GROUP BY
        passes.user_id,
        orders.id,
        orders.created_at,
        passes.type,
        stage_translations.stage_tail,
        stage_translations.stage_head,
        stages. "number"`;

        const groupedData: { [key: string]: PassSummaryResult[] } = {};

        for (const item of passesSummaryDetails) {
          const key = `${item['userId']}-${item['orderId']}`;

          if (!groupedData[key]) {
            groupedData[key] = [];
          }

          groupedData[key].push(item);
        }

        const formattedData = [];

        for (const [_, value] of Object.entries(groupedData)) {
          if (value?.length === 0) {
            return;
          }

          let adultCount = 0;
          let childCount = 0;

          const passes = await this.prisma.passes.findMany({
            where: {
              orderId: value[0]['orderId'],
              stageId: closedDay.stageId,
              reservedFor: closedDate,
              isCancelled: false,
              userId: value[0]['userId'],
            },
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });

          value.forEach((item) => {
            if (item['passType'] === PASS_USER_TYPE[PASS_USER_TYPE_CODE.ADULT]) {
              adultCount += item['passQuantity'];
            } else if (item['passType'] === PASS_USER_TYPE[PASS_USER_TYPE_CODE.CHILD]) {
              childCount += item['passQuantity'];
            }
          });

          formattedData.push({
            orderId: value[0]['orderId'],
            orderedDate: value[0]['orderedDate'],
            userId: value[0]['userId'],
            userData: passes?.length > 0 ? passes[0].user : null,
            stageData: {
              stageHead: value[0]['stageHead'],
              stageTail: value[0]['stageTail'],
              stageNumber: value[0]['stageNumber'],
            },
            adultCount,
            childCount,
            passNumbers: passes.map((pass, index) => {
              return {
                passNo: index,
                passId: generatePassId(value[0]['stageNumber'], closedDay.closedDate, pass.passId),
              };
            }),
          });
        }

        if (formattedData?.length > 0) {
          formattedData.forEach((userPassSummaryDetail) => {
            const mailOptions: nodemailer.SendMailOptions = {
              to: userPassSummaryDetail['userData']['email'],
              subject: `${MAIL_FROM}: Trail Closure Notification`,
            };

            this.mailService.sendMail(mailOptions, {
              templateName: EMAIL_TEMPLATES.STAGE_CLOSURE,
              templateVars: {
                firstName: userPassSummaryDetail.userData.firstName,
                lastName: userPassSummaryDetail.userData.lastName,
                stageNumber: userPassSummaryDetail.stageData.stageNumber.toString(),
                stageHead: userPassSummaryDetail.stageData.stageHead,
                stageTail: userPassSummaryDetail.stageData.stageTail,
                bookingDate: moment(userPassSummaryDetail['orderedDate']).format('Do MMMM YYYY'),
                travelDate: moment(closedDate).format('Do MMMM YYYY'),
                adults: userPassSummaryDetail.adultCount.toString(),
                children: userPassSummaryDetail.childCount.toString(),
                total: (
                  userPassSummaryDetail.childCount + userPassSummaryDetail.adultCount
                ).toString(),
                passNumbers: userPassSummaryDetail.passNumbers,
                cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
              },
            });
          });
        }

        // update the order and passes status after sending the email
        await this.prisma.$transaction(async (tx) => {
          for (const item of formattedData) {
            await tx.passes.updateMany({
              where: {
                orderId: item.orderId,
                stageId: closedDay.stageId,
                reservedFor: closedDate,
                isCancelled: false,
                userId: item.userId,
              },
              data: {
                isCancelled: true,
                cancelledAt: new Date(),
                activated: false,
              },
            });

            await tx.orders.update({
              where: {
                id: item.orderId,
              },
              data: {
                status: ORDER_STATUS.CANCELLED,
              },
            });
          }
        });
      }),
    );
  }
}
