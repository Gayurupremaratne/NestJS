import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsUUID } from 'class-validator';

export class AmendPassRequestBodyDto {
  @ApiProperty()
  @IsDate()
  date: Date;

  @ApiProperty()
  @IsUUID()
  @Exists('stage', 'id')
  stageId: string;
}
