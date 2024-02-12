import { Unique } from '@common/validators/UniqueConstraint';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdatePolicyDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  acceptanceRequired?: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Unique('policy', 'slug', 'id')
  slug?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  order: number;
}
