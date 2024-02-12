import { BADGE_TYPES } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class BadgeDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  badgeKey: string;

  @ApiProperty()
  @IsString()
  type: (typeof BADGE_TYPES)[number];

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  stageId?: string;

  createdAt: Date;
  updatedAt: Date;
}
