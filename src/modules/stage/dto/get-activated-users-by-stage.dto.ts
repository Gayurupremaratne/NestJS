import { PASS_USER_TYPE } from '@common/constants';
import { User, UserTrailTracking } from '@prisma/client';
import { IsBoolean, IsDate, IsString, IsUUID } from 'class-validator';

export class ActivatedUserInStageDto {
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

  @IsString()
  type: (typeof PASS_USER_TYPE)[number];

  createdAt?: Date;

  updatedAt?: Date;

  user?: User;

  userTrailTrack?: UserTrailTracking;
}
