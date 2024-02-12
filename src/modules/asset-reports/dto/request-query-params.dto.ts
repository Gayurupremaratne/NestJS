import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestQueryParamsDto {
  @ApiProperty()
  @IsNumber()
  perPage: number;

  @ApiProperty()
  @IsNumber()
  pageNumber: number;

  @ApiProperty()
  @IsOptional()
  status: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
