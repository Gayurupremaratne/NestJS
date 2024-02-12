import { BadRequestException, Injectable } from '@nestjs/common';
import { StageRepository } from './stage.repository';
import { plainToClass, plainToInstance } from 'class-transformer';
import { StageDto } from './dto/stage.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import {
  convertStageDatabaseToResponse,
  convertStageInputToStageDatabase,
} from '@common/helpers/stage-response-converter';
import { PaginatedResult } from '@common/helpers';
import { GetStageDto } from './dto/get-stage-dto';
import { ActivatedUserInStageDto } from './dto/get-activated-users-by-stage.dto';

@Injectable()
export class StageService {
  constructor(private stageRepository: StageRepository) {}

  async getAllStages(
    userId: string,
    getStageDto?: GetStageDto,
  ): Promise<PaginatedResult<StageDto>> {
    const retrievedStages = await this.stageRepository.getAllStages(userId, getStageDto);
    const stages = retrievedStages.data.map((stage) => convertStageDatabaseToResponse(stage, true));
    return {
      data: stages,
      meta: retrievedStages.meta,
    };
  }

  async getStage(id: string, userId?: string): Promise<StageDto | null> {
    const retrievedStage = await this.stageRepository.getStage(id, userId);
    const stageToDto = convertStageDatabaseToResponse(retrievedStage, true);
    return plainToClass(StageDto, stageToDto);
  }

  async createStage(data: CreateStageDto): Promise<StageDto> {
    const stagesWithTheSameNumber = await this.stageRepository.getStagesWithSameStageNumber(
      data.number,
    );

    if (stagesWithTheSameNumber > 0) {
      throw new BadRequestException(
        'Stage already exists for the given stage number, Please provide a unique stage number',
      );
    }
    const stageToCreate = convertStageInputToStageDatabase(data);
    const createdStage = await this.stageRepository.createStage(stageToCreate);
    const stageToDto = convertStageDatabaseToResponse(createdStage);
    return plainToClass(StageDto, stageToDto);
  }

  async updateStage(id: string, data: UpdateStageDto): Promise<StageDto> {
    const stageToUpdate = convertStageInputToStageDatabase(data);
    const updatedStage = await this.stageRepository.updateStage(id, stageToUpdate);
    const stageToDto = convertStageDatabaseToResponse(updatedStage);
    return plainToClass(StageDto, stageToDto);
  }

  async deleteStage(id: string): Promise<string> {
    return this.stageRepository.deleteStage(id);
  }

  async getTopPopularStages(userId: string): Promise<StageDto[]> {
    const retrievedStages = await this.stageRepository.getTopPopularStages(userId);
    const stagesToDto = retrievedStages.map((stage) => convertStageDatabaseToResponse(stage, true));
    return plainToInstance(StageDto, stagesToDto);
  }

  async getActivatedUsersByStage(
    stageId: string,
    perPage: number,
    pageNumber: number,
    field?: string,
    value?: string,
    reservedFor?: string,
  ): Promise<PaginatedResult<ActivatedUserInStageDto>> {
    const retrievedUserOfStage = await this.stageRepository.getActivatedUsersByStage(
      stageId,
      perPage,
      pageNumber,
      field,
      value,
      reservedFor,
    );
    const data = plainToInstance(ActivatedUserInStageDto, retrievedUserOfStage.data);
    return {
      data,
      meta: retrievedUserOfStage.meta,
    };
  }
}
