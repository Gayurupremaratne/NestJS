import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class NoticeIdentifierDto {
  @IsUUID()
  @Exists('notice', 'id', NotFoundHelper)
  id: string;
}

export class NoticeStageIdentifierDto {
  @IsUUID()
  @ApiProperty()
  stageId: string;
}
