import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StageMediaReqParamDto {
  @IsString()
  @Exists('stage', 'id', NotFoundHelper)
  @ApiProperty()
  stageId: string;
}
