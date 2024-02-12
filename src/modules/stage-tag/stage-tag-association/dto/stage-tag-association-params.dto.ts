import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class StageTagAssociationParamDto {
  @IsUUID()
  @Exists('stageTag', 'id')
  stageTagId: string;
}
