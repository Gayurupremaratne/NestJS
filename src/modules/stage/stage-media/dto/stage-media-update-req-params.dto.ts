import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsString } from 'class-validator';

export class StageMediaUpdateReqParamDto {
  @IsString()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;

  @IsString()
  @Exists('stageMedia', 'id', NotFoundHelper)
  mediaId: string;
}
