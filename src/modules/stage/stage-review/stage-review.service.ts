import { Injectable } from '@nestjs/common';
import { StageReviewsRepository } from './stage-review.repository';
import { plainToClass } from 'class-transformer';
import { StageReviewDto } from './dto/stage-review.dto';
import { CreateStageReviewDto } from './dto/create-stage-review.dto';
import { UpdateStageReviewDto } from './dto/update-stage-review.dto';
import { PaginatedResult } from '@common/helpers/paginator';

@Injectable()
export class StageReviewService {
  constructor(private stageReviewRepository: StageReviewsRepository) {}

  async getAllStageReviews(
    stageId: string,
    pageNumber: number,
    perPage: number,
  ): Promise<PaginatedResult<StageReviewDto[]>> {
    return await this.stageReviewRepository.getAllStageReviews(stageId, pageNumber, perPage);
  }

  async createStageReview(
    stageId: string,
    data: CreateStageReviewDto,
    userId: string,
  ): Promise<StageReviewDto> {
    //create a review record
    const createdStageReview = await this.stageReviewRepository.createStageReview(
      stageId,
      data,
      userId,
    );

    return plainToClass(StageReviewDto, createdStageReview);
  }

  async updateStageReview(
    stageId: string,
    id: string,
    data: UpdateStageReviewDto,
    userId: string,
  ): Promise<StageReviewDto> {
    //update the existing review record
    const updateStageReview = await this.stageReviewRepository.updateStageReview(
      stageId,
      id,
      data,
      userId,
    );

    return plainToClass(StageReviewDto, updateStageReview);
  }

  async deleteStageReview(stageId: string, id: string): Promise<string> {
    const deletedStageReviewId = await this.stageReviewRepository.deleteStageReview(stageId, id);

    return deletedStageReviewId;
  }
}
