import { Injectable } from '@nestjs/common';
import { CreateStageRegionDto } from './dto/create-stage-region.dto';
import { StageRegionRepository } from './stage-region.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class StageRegionService {
  constructor(private stageRegionRepository: StageRegionRepository) {}

  async createStageRegion(
    stageId: string,
    data: CreateStageRegionDto,
  ): Promise<[Prisma.BatchPayload, Prisma.BatchPayload]> {
    return await this.stageRegionRepository.createStageRegion(stageId, data);
  }
}
