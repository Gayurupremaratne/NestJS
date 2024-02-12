import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PoiParamDto {
  @ApiProperty()
  @IsUUID()
  @Exists('pointOfInterest', 'id', NotFoundHelper)
  id: string;
}

export class PoiStageParamDto {
  @ApiProperty()
  @IsUUID()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;
}
