import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class DeviceTokenDto {
  @ApiProperty()
  @IsUUID()
  @Exists('user', 'id')
  userId: string;

  @ApiProperty()
  @IsString()
  token: string;
}

export class CreatePushNotificationDto {
  @ApiProperty({ type: [DeviceTokenDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeviceTokenDto)
  deviceTokenData: DeviceTokenDto[];

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty()
  @IsEnum($Enums.NOTICE_TYPE)
  notificationType: $Enums.NOTICE_TYPE;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  noticeId?: string;
}

export class PushNotificationIsReadDto {
  @ApiProperty()
  @IsBoolean()
  isRead: boolean;
}
