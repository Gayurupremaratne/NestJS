import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UserFavouriteStageDto {
  @ApiProperty()
  @IsUUID()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;
}
