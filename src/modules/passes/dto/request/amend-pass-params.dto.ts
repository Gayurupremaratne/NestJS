import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AmendPassParamsDto {
  @ApiProperty()
  @IsUUID()
  @Exists('orders', 'id')
  orderId: string;
}
