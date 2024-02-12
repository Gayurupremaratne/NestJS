import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestReportedUsersDto {
  @ApiProperty()
  @IsNumber()
  perPage: number;

  @ApiProperty()
  @IsNumber()
  pageNumber: number;

  @ApiProperty()
  @IsOptional()
  reportId: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
