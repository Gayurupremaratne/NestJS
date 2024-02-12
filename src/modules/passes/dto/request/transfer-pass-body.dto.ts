import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferPassBodyDto {
  @ApiProperty()
  @IsUUID()
  @Exists('user', 'id')
  userId: string;
}
