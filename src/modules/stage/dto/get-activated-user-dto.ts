import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetActivatedUsersByStageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  field?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reservedFor?: string;

  @ApiProperty({ required: true })
  @IsNumber()
  perPage: number;

  @ApiProperty({ required: true })
  @IsNumber()
  pageNumber: number;
}
