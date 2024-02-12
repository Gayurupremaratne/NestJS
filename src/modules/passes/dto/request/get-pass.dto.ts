import { PassType } from '@common/constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class GetPassDto {
  @ApiPropertyOptional({ type: String })
  @IsInt()
  @IsOptional()
  perPage?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  pageNumber: number;

  @ApiPropertyOptional({
    enum: PassType,
  })
  @IsOptional()
  @IsEnum(PassType, { message: 'Invalid pass type' })
  type?: PassType;
}
