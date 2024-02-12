import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsString } from 'class-validator';

export class StageMediaDeleteReqParamDto {
  @IsString()
  @Exists('stageMedia', 'id', NotFoundHelper)
  mediaId: string;
}
