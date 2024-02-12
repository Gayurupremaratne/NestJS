import { PassConditionTranslation } from '@prisma/client';
import { PassConditionMetaDto } from '../../meta/dto/pass-condition-meta.dto';

export class PassConditionTranslationResponse {
  passConditions: PassConditionTranslation[];

  metaTranslations: PassConditionMetaDto[];
}
