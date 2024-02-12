import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class StageTagTranslationParamsDto {
  @IsUUID()
  @Exists('stageTag', 'id')
  stageTagId: string;

  @Exists('locale', 'code')
  localeId: string;
}
