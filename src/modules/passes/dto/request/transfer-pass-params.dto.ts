import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferPassParamDto {
  @ApiProperty()
  @IsUUID()
  @Exists('passes', 'id')
  id: string;
}
