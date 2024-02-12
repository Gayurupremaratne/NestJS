import { PaginatedResult } from '@common/helpers';
import { Injectable } from '@nestjs/common';
import { StageTag } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { StageTagDto } from './dto/stage-tag.dto';
import { StageTagRepository } from './stage-tag.repository';
import { StageTagQueryParamDto } from './dto/stage-tag-query-params.dto';

@Injectable()
export class StageTagService {
  constructor(private stageTagRepository: StageTagRepository) {}

  async getAllTagsEn(queryParams: StageTagQueryParamDto): Promise<PaginatedResult<StageTag[]>> {
    return await this.stageTagRepository.getAllTagsEn(queryParams);
  }

  async getAllTags(
    pageNumber: number,
    perPage: number,
    stages?: string | number,
  ): Promise<PaginatedResult<StageTag[]>> {
    return await this.stageTagRepository.getAllTags(perPage, pageNumber, stages);
  }

  async getStageTag(id: string): Promise<StageTagDto | null> {
    return plainToClass(StageTagDto, await this.stageTagRepository.getStageTag(id));
  }

  async createStageTag(): Promise<StageTagDto> {
    return plainToClass(StageTagDto, await this.stageTagRepository.createStageTag());
  }

  async updateStageTag(id: string): Promise<StageTagDto> {
    return plainToClass(StageTagDto, await this.stageTagRepository.updateStageTag(id));
  }

  async deleteStageTag(id: string): Promise<string> {
    return this.stageTagRepository.deleteStageTag(id);
  }
}
