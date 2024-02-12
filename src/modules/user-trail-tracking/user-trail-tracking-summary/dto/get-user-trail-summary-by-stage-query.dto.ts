import { COMPLETION_STATUS } from '@common/constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class GetUserTrailTrackingSummaryByStageQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  perPage?: number;

  @ApiProperty()
  @IsNumber()
  pageNumber: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsEnum(COMPLETION_STATUS)
  type?: string;
}
