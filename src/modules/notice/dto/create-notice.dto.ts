import {
  DeliveryGroup,
  DeliveryGroupEnum,
  NoticeType,
  NoticeTypeEnum,
  NoticeValidityPeriod,
  NoticeValidityPeriodEnum,
} from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateNoticeTranslationDto } from './create-notice-translation.dto';

export class CreateNoticeDto {
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
  @IsEnum(NoticeValidityPeriodEnum, { message: 'Invalid notice validity period' })
  isValidityPeriodDefined: NoticeValidityPeriod;

  @ApiProperty()
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsDate()
  endDate: Date;

  @ApiProperty()
  @ArrayMinSize(1)
  @Type(() => CreateNoticeTranslationDto)
  noticeTranslation: CreateNoticeTranslationDto[];
}
