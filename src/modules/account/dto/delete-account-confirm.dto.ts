import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteAccountConfirm {
  @ApiProperty({ type: String })
  @IsUUID()
  @Exists('user', 'id')
  userId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  token: string;
}
