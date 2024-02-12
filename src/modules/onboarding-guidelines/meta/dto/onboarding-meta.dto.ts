import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OnboardingMetaDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(50)
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiProperty({ type: String })
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
