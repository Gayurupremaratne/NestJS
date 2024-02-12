import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { OrderByItem, TransformValidateOrderBy } from '@common/validators/transformOrderBy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetAllStoryDto {
  @ApiPropertyOptional({ type: String })
  @IsInt()
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty()
  @IsInt()
  pageNumber: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @TransformValidateOrderBy(['title', 'number'])
  orderBy?: OrderByItem[];

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}

export class GetStoryByStageDto {
  @ApiProperty()
  @IsUUID()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;
}

export interface GetStoryDataDto {
  id: string;
  latitude: number;
  longitude: number;
  createdAt?: Date;
  updatedAt?: Date;
  stageId: string;
  stageStoryTranslations?: StageStoryTranslations[];
  stages?: StageDto;
}

export type StageStoryTranslations = {
  localeId?: string;
  title: string;
  audioKey: string;
  createdAt?: Date;
  updatedAt?: Date;
};
