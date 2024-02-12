import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class CreateStageRegionParamDto {
  @IsUUID()
  @Exists('stage', 'id')
  stageId: string;
}
