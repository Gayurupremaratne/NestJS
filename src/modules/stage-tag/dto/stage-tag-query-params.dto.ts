import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class StageTagQueryParamDto {
  @ApiProperty()
  @IsInt()
  @IsOptional({ always: true })
  perPage: number;

  @ApiProperty()
  @IsInt()
  @IsOptional({ always: true })
  pageNumber: number;

  @ApiProperty()
  @IsOptional({ always: true })
  stages?: string | number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
