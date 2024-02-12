import { PASS_USER_TYPE } from '@common/constants';
import { IsBoolean, IsDate, IsString, IsUUID } from 'class-validator';

export class PassesEntity {
  @IsUUID()
  id?: string;

  @IsUUID()
  stageId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  orderId: string;

  @IsBoolean()
  activated: boolean;

  @IsBoolean()
  isTransferred: boolean;

  @IsDate()
  reservedFor: Date;

  @IsBoolean()
  isCancelled: boolean;

  @IsDate()
  expiredAt: Date;

  @IsDate()
  cancelledAt?: Date;

  @IsString()
  type: (typeof PASS_USER_TYPE)[number];
}
