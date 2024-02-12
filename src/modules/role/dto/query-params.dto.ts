import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryParamsDto {
  @ApiProperty({ required: true })
  @IsInt()
  perPage: number;

  @ApiProperty({ required: true })
  @IsNumber()
  pageNumber: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
