import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { StageReview } from '@prisma/client';

@Injectable()
export class StageReviewsRepository {
  constructor(private prisma: PrismaService) {}

  async getStageReview(id: string): Promise<StageReview | null> {
    const stageReview = await this.prisma.stageReview.findUnique({ where: { id } });
    if (!stageReview) throw new NotFoundException();
    return stageReview;
  }
}
