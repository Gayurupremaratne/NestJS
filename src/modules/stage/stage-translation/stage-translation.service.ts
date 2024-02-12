import { plainToClass } from 'class-transformer';
import { StageTranslationDto } from './dto/stage-translation.dto';
import { UpdateStageTranslationDto } from './dto/update-stage-translation.dto';
import { StageTranslationRepository } from './stage-translation.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StageTranslationService {
  constructor(private stageTranslationRepository: StageTranslationRepository) {}

  async updateStageTranslation(data: UpdateStageTranslationDto): Promise<StageTranslationDto> {
    return plainToClass(
      StageTranslationDto,
      this.stageTranslationRepository.updateStageTranslation(data),
    );
  }
}
