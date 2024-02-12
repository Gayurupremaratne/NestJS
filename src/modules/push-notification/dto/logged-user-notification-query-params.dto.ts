import { NOTICE_CATEGORY } from '@common/constants/notice_category.constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';

export class LoggedUserNotificationQueryParams {
  @ApiProperty({ required: true })
  @IsNumber()
  perPage: number;

  @ApiProperty({ required: true })
  @IsNumber()
  pageNumber: number;

  @ApiProperty({ required: true })
  @IsEnum(NOTICE_CATEGORY, { message: `Category must be one of ${NOTICE_CATEGORY}` })
  category: string;
}
