import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ClosedStagesQueryParamsDto {
  @ApiProperty({ required: true })
  @IsString()
  closedStartDate: string;

  @ApiProperty({ required: true })
  @IsString()
  closedEndDate: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  orderBy?: string;
}
