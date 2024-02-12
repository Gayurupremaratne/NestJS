import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class StageParamDto {
  @IsUUID()
  @Exists('stage', 'id', NotFoundHelper)
  id: string;
}
