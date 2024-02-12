import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class StageTagParamDto {
  @IsUUID()
  @Exists('stageTag', 'id')
  id: string;
}
