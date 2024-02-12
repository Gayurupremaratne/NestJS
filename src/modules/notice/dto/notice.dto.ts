import {
  DeliveryGroup,
  DeliveryGroupEnum,
  NoticeStatus,
  NoticeStatusEnum,
  NoticeType,
  NoticeTypeEnum,
  NoticeValidityPeriod,
  NoticeValidityPeriodEnum,
} from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateNoticeTranslationDto } from './create-notice-translation.dto';

export class NoticeDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  createdBy: string;

  @ApiProperty()
  @IsUUID()
  updatedBy: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  category?: string | null;

  @ApiProperty()
  @IsEnum(NoticeTypeEnum, { message: 'Invalid notice type' })
  type: NoticeType;

  @ApiProperty()
  @IsEnum(DeliveryGroupEnum, { message: 'Invalid delivery group' })
  deliveryGroup: DeliveryGroup;

  @ApiProperty()
  @IsEnum(NoticeStatusEnum, { message: 'Invalid notice status' })
  status: NoticeStatus;

  @ApiProperty()
  @IsEnum(NoticeValidityPeriodEnum, { message: 'Invalid notice validity period' })
  isValidityPeriodDefined: NoticeValidityPeriod;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  createdAt: Date;
  updatedAt: Date;

  @ApiProperty()
  @Type(() => CreateNoticeTranslationDto)
  noticeTranslation: CreateNoticeTranslationDto[];
}
