import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PassConditionTranslation, Prisma } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { PassConditionParamDto } from './dto/pass-condition-param.dto';
import { PassConditionTranslationResponse } from './dto/pass-condition-response.dto';
import { PassConditionDto } from './dto/pass-condition.dto';
import { UpsertPassConditionTranslationDto } from './dto/upsert-pass-condition-translation.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class PassConditionService {
  constructor(private prisma: PrismaService) {}

  async getAllPassConditions(): Promise<PassConditionTranslationResponse> {
    try {
      const passConditions = await this.prisma.passConditionTranslation.findMany({
        orderBy: { order: 'asc' },
      });

      const metaTranslations = await this.prisma.passConditionMetaTranslation.findMany({});

      return {
        metaTranslations,
        passConditions,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve pass conditions');
    }
  }

  async upsertPassConditionTranslation(
    passconditionTranslations: UpsertPassConditionTranslationDto[],
  ): Promise<PassConditionTranslation[]> {
    try {
      return await this.prisma.$transaction(
        passconditionTranslations.map((passCondition) =>
          this.prisma.passConditionTranslation.upsert({
            where: {
              order_localeId: {
                order: passCondition.order,
                localeId: passCondition.localeId,
              },
            },
            create: passCondition,
            update: passCondition,
          }),
        ),
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'pass-condition' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new ConflictException(
            `${error.meta.target.toString()} property should contain unique values`,
          );
        }
      }
      throw new InternalServerErrorException('Failed to upsert pass condition');
    }
  }

  async getPassConditionsByLocaleAndOrder(
    locale: string,
    order: number,
  ): Promise<PassConditionTranslation[]> {
    return await this.prisma.passConditionTranslation.findMany({
      where: {
        localeId: locale,
        order: { gt: order },
      },
    });
  }

  async removePassConditionTranslation(params: PassConditionParamDto): Promise<PassConditionDto> {
    try {
      let deletedTranslation: PassConditionTranslation;

      const passconditionTranslation = this.prisma.passConditionTranslation.findUnique({
        where: { order_localeId: { order: params.order, localeId: params.localeId } },
      });

      if (!passconditionTranslation) throw new NotFoundException();

      await this.prisma.$transaction(async (tx) => {
        deletedTranslation = await tx.passConditionTranslation.delete({
          where: {
            order_localeId: { order: params.order, localeId: params.localeId },
          },
        });

        //get passconditions need to update order
        const passconditionsNeedToUpdateOrders = await this.getPassConditionsByLocaleAndOrder(
          deletedTranslation.localeId,
          deletedTranslation.order,
        );

        //update passcondition order
        if (passconditionsNeedToUpdateOrders.length > 0) {
          await Promise.all(
            passconditionsNeedToUpdateOrders.map((passcondition) =>
              tx.passConditionTranslation.update({
                where: {
                  order_localeId: { order: passcondition.order, localeId: passcondition.localeId },
                },
                data: { order: passcondition.order - 1 },
              }),
            ),
          );
        }
      });

      return plainToClass(PassConditionDto, deletedTranslation);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'pass-condition' }, level: 'error' });
      throw new InternalServerErrorException('Failed to delete pass condition');
    }
  }
}
