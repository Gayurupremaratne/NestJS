import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BadgeIdentifierDto {
  @IsUUID()
  @Exists('badge', 'id', NotFoundHelper)
  id: string;
}

export class BadgeStageIdentifierDto {
  @IsUUID()
  @ApiProperty()
  stageId: string;
}
