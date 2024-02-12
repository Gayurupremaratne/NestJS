import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { StageReview } from '@prisma/client';
import { CreateStageReviewDto } from './dto/create-stage-review.dto';
import { UpdateStageReviewDto } from './dto/update-stage-review.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageReviewsRepository {
  constructor(private prisma: PrismaService) {}

  async getAllStageReviews(
    stageId: string,
    pageNumber: number,
    perPage: number,
  ): Promise<PaginatedResult<StageReview[]>> {
    const paginate: PaginateFunction = paginator({ perPage });

    return await paginate(
      this.prisma.stageReview,
      { where: { stageId }, include: { user: true } },
      {
        page: pageNumber,
      },
    );
  }

  async createStageReview(
    stageId: string,
    data: CreateStageReviewDto,
    userId: string,
  ): Promise<StageReview> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const stageReview = await tx.stageReview.create({
          data: {
            ...data,
            stageId,
            userId,
          },
        });
        const stage = await tx.stage.findFirst({ where: { id: stageId } });

        const updatedCumulativeReviews = stage.cumulativeReviews + stageReview.rating;
        const reviewsCount = ++stage.reviewsCount;

        const stageToUpdate = {
          ...stage,
          cumulativeReviews: updatedCumulativeReviews,
          reviewsCount,
        };

        await tx.stage.update({ where: { id: stageId }, data: stageToUpdate });

        return stageReview;
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-review' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async updateStageReview(
    stageId: string,
    id: string,
    data: UpdateStageReviewDto,
    userId: string,
  ): Promise<StageReview> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingStageReview = await tx.stageReview.findFirst({
          where: { id, userId: userId },
        });

        if (!existingStageReview) {
          throw new BadRequestException('You are not authorized to update this review');
        }
        const updatedReview = await tx.stageReview.update({
          where: { id },
          data: {
            ...data,
            stageId,
            userId,
          },
        });
        const stage = await tx.stage.findFirst({ where: { id: stageId } });

        const difference = updatedReview.rating - existingStageReview.rating;
        const updatedCumulativeReviews = stage.cumulativeReviews + difference;

        const stageToUpdate = {
          ...stage,
          cumulativeReviews: updatedCumulativeReviews,
        };

        await tx.stage.update({ where: { id: stageId }, data: stageToUpdate });

        return updatedReview;
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-review' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async deleteStageReview(stageId: string, id: string): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      const stageReviewToDelete = await tx.stageReview.findFirst({ where: { id } });
      const stageReview = await tx.stageReview.delete({ where: { stageId, id } });

      const stage = await tx.stage.findFirst({ where: { id: stageId } });

      const updatedCumulativeReviews = stage.cumulativeReviews - stageReviewToDelete.rating;
      const reviewsCount = --stage.reviewsCount;

      const stageToUpdate = {
        ...stage,
        cumulativeReviews: updatedCumulativeReviews,
        reviewsCount,
      };
      await tx.stage.update({ where: { id: stageId }, data: stageToUpdate });

      return stageReview.id;
    });
  }
}
