import { OrderByItem, TransformValidateOrderBy } from '@common/validators/transformOrderBy';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DELIVERY_GROUP, NOTICE_STATUS, NOTICE_TYPE } from '@prisma/client';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class GetNoticePaginationDto {
  @ApiPropertyOptional({ type: String })
  @IsInt()
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ type: String })
  @IsInt()
  @IsOptional()
  pageNumber?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @TransformValidateOrderBy(['title', 'category', 'startDate', 'endDate', 'status'])
  orderBy?: OrderByItem[];

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}

export interface GetNoticeDto {
  id: string;
  category: string;
  type: NOTICE_TYPE;
  deliveryGroup: DELIVERY_GROUP;
  status: NOTICE_STATUS;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  createdBy: string;
  updatedBy: string;
  isEligibleForModifyOrDelete: boolean;
  noticeTranslation?: GetNoticeTranslationDto[];
  noticeStage?: GetNoticeStageDto[];
}

export interface GetNoticeTranslationDto {
  localeId: string;
  title: string;
  description: string;
}

export interface GetNoticeStageDto {
  id: string;
  number: number;
}
