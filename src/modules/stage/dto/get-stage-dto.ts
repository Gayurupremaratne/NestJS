import { STAGE_SORT_STATUS_TYPE } from '@common/constants';
import { FAMILY_FRIENDLY_STATUS } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS } from '@common/constants/people_interaction.constant';
import { StageSortTypes } from '@common/constants/stage-sort.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetStageDto {
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  tagIds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  distanceRanges?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyFriendly?: (typeof FAMILY_FRIENDLY_STATUS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  peopleInteraction?: (typeof PEOPLE_INTERACTIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: (typeof STAGE_SORT_STATUS_TYPE)[number];

  @ApiProperty({ type: String, default: StageSortTypes.STAGE })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  perPage: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  pageNumber: number;
}
