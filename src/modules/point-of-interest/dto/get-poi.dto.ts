import { TransformValidateOrderBy, OrderByItem } from '@common/validators/transformOrderBy';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class GetPoiPaginationDto {
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
  @TransformValidateOrderBy(['title', 'number'])
  orderBy?: OrderByItem[];

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}

export interface GetPoiDto {
  id: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
  mediaKey: string;
  pointOfInterestTranslation?: GetPoiTranslationDto[];
}

export interface GetPoiTranslationDto {
  localeId: string;
  title: string;
  description: string;
  pointOfInterestId: string;
  createdAt: Date;
  updatedAt: Date;
}
