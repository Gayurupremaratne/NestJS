import { StatusFilter } from '@common/constants/status-filter.constants';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { parseSortOrder } from '@common/helpers/parse-sort';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Prisma, Promotions } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetAllPromotionDto } from './dto/get-all-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PROMOTION_ACTIVE_COUNT } from '@common/constants/promotion.constants';

@Injectable()
export class PromotionRepository {
  constructor(private prisma: PrismaService) {}

  async getAllPromotions(data: GetAllPromotionDto): Promise<PaginatedResult<Promotions[]>> {
    try {
      let filterIsActive: boolean | object = {};

      switch (data.status) {
        case StatusFilter.ACTIVE:
          filterIsActive = true;
          break;
        case StatusFilter.INACTIVE:
          filterIsActive = false;
          break;
        default:
          filterIsActive = {};
          break;
      }

      const paginate: PaginateFunction = paginator({ perPage: data.perPage });
      return await paginate(
        this.prisma.promotions,
        {
          where: {
            isActive: filterIsActive,
            promotionTranslations: {
              some: {
                title: {
                  contains: data.search,
                  mode: 'insensitive',
                },
              },
            },
          },
          include: { promotionTranslations: true },
          orderBy: { createdAt: 'desc' },
        },
        {
          page: data.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      throw new InternalServerErrorException('Failed to get all promotions');
    }
  }

  async getAllPromotionsEn(data: GetAllPromotionDto): Promise<PaginatedResult<Promotions[]>> {
    try {
      let filterIsActive: boolean | object = {};

      switch (data.status) {
        case StatusFilter.ACTIVE:
          filterIsActive = true;
          break;
        case StatusFilter.INACTIVE:
          filterIsActive = false;
          break;
        default:
          filterIsActive = {};
          break;
      }

      const paginate: PaginateFunction = paginator({ perPage: data.perPage });

      return await paginate(
        this.prisma.promotionEn,
        {
          where: {
            isActive: filterIsActive,
            title: {
              contains: data.search,
              mode: 'insensitive',
            },
          },
          orderBy: parseSortOrder(data.sortBy, 'PromotionEn'),
        },
        {
          page: data.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      throw new InternalServerErrorException('Failed to get all promotions');
    }
  }

  async getPromotion(id: string): Promise<Promotions | null> {
    try {
      const promotion = await this.prisma.promotions.findUniqueOrThrow({
        where: { id },
        include: { promotionTranslations: true },
      });
      return promotion;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Not Found
        if (error.code === 'P2025') {
          throw new NotFoundException(`Promotion not found`);
        }
      }
      throw new InternalServerErrorException('Failed to get promotion');
    }
  }

  async createPromotion(data: CreatePromotionDto): Promise<Promotions> {
    try {
      return await this.prisma.promotions.create({
        data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new ConflictException(
            `${error.meta.target.toString()} property should contain unique values`,
          );
        }
      }
      throw new InternalServerErrorException('Failed to create promotion');
    }
  }

  async isPromotionEligibleToUpdate(
    promotionId: string,
    data: UpdatePromotionDto,
  ): Promise<boolean> {
    let activePromotions: Promotions[] = [];
    try {
      if (!data.isActive) return true;

      activePromotions = await this.prisma.promotions.findMany({
        where: {
          isActive: true,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      throw new InternalServerErrorException('Failed to get active promotions');
    }

    const isCurrentPromotionActiveInDb = activePromotions.some(
      (activePromotion) => activePromotion.id === promotionId,
    );

    const isEligibleToUpdate =
      isCurrentPromotionActiveInDb ||
      (!isCurrentPromotionActiveInDb && activePromotions.length < PROMOTION_ACTIVE_COUNT);

    return isEligibleToUpdate;
  }

  async updatePromotion(id: string, data: UpdatePromotionDto): Promise<Promotions> {
    const isEligibleToUpdate = await this.isPromotionEligibleToUpdate(id, data);
    if (!isEligibleToUpdate)
      throw new BadRequestException(
        `You already have ${PROMOTION_ACTIVE_COUNT} active promotions. Please mark 1 as 'Inactive' and proceed with this action.`,
      );

    try {
      const updatedPromotion = await this.prisma.promotions.update({
        where: { id },
        data,
      });
      return updatedPromotion;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      throw new InternalServerErrorException('Something went wrong, please try again');
    }
  }

  async deletePromotion(id: string): Promise<string> {
    try {
      const promotion = this.prisma.promotions.findUnique({
        where: { id },
      });

      if (!promotion) throw new NotFoundException();

      const deletedPromotion = await this.prisma.promotions.delete({ where: { id } });
      return deletedPromotion.id;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'promotion' }, level: 'error' });
      throw new InternalServerErrorException('Failed to delete promotion');
    }
  }
}
