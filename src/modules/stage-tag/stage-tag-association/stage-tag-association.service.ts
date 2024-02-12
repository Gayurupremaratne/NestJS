import { Injectable } from '@nestjs/common';
import { StageTagAssociationDto } from './dto/stage-tag-association.dto';
import { UpdateStageTagAssociationDto } from './dto/update-stage-tag-association.dto';
import { StageTagAssociationRepository } from './stage-tag-association.repository';
import { PaginatedResult } from '@common/helpers';
import { Prisma } from '@prisma/client';

@Injectable()
export class StageTagAssociationService {
  constructor(private stageTagRepository: StageTagAssociationRepository) {}

  async getStageTagAssociation(
    id: string,
    perPage: number,
    pageNumber: number,
  ): Promise<PaginatedResult<StageTagAssociationDto[]>> {
    return await this.stageTagRepository.getStageTagAssociation(id, perPage, pageNumber);
  }

  async updateStageTagAssociation(
    stageTagId: string,
    data: UpdateStageTagAssociationDto,
  ): Promise<[Prisma.BatchPayload, Prisma.BatchPayload]> {
    return await this.stageTagRepository.updateStageTagAssociation(stageTagId, data);
  }
}
