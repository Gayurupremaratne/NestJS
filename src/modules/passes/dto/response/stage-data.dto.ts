import { StageDifficultyTypes } from '@common/constants';
import { StageTranslationData } from './stage-translation-data.dto';
import { PassesData } from './passes-data.dto';
import { StageMedia } from '@prisma/client';

export class StageData {
  distance: number;
  estimatedDuration: number;
  number: number;
  difficultyType: StageDifficultyTypes;
  openTime: Date;
  closeTime: Date;
  elevationGain: number;
  stagesTranslation: Array<StageTranslationData>;
  passes: Array<PassesData>;
  media: Array<StageMedia>;
}
