import { Injectable } from '@nestjs/common';
import { StageReviewsRepository } from './stage-review.repository';
import { plainToClass } from 'class-transformer';
import { StageReviewDto } from './dto/stage-review.dto';

@Injectable()
export class StageReviewService {
  constructor(private stageReviewRepository: StageReviewsRepository) {}

  async getStageReview(id: string): Promise<StageReviewDto> {
    return plainToClass(StageReviewDto, await this.stageReviewRepository.getStageReview(id));
  }
}
