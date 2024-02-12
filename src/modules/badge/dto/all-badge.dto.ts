import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class GetAllBadgeDto {
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
  @IsString()
  @IsOptional()
  sortBy?: string;
}
