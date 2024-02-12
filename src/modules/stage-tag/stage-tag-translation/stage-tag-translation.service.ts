import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { UpdateStageTagTranslationDto } from './dto/update-stage-tag-translation.dto';
import { StageTagTranslationDto } from './dto/stage-tag-translation.dto';
import { StageTagTranslationRepository } from './stage-tag-translation.repository';

@Injectable()
export class StageTagTranslationService {
  constructor(private stageTagTranslationRepository: StageTagTranslationRepository) {}

  async updateStageTagTranslation(
    stageTagId: string,
    localeId: string,
    data: UpdateStageTagTranslationDto,
  ): Promise<StageTagTranslationDto> {
    return plainToClass(
      StageTagTranslationDto,
      await this.stageTagTranslationRepository.updateStageTagTranslation(
        stageTagId,
        localeId,
        data,
      ),
    );
  }
}
