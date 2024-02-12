import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CancelledPassQueryParamsDto {
  @ApiProperty({ required: true })
  @IsUUID()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;

  @ApiProperty({ required: true })
  @IsString()
  reservedFor: string;
}
