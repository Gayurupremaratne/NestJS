import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdatePromotionTranslationDto {
  @ApiProperty()
  @IsUUID()
  @Exists('promotions', 'id')
  promotionId: string;

  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50, { message: 'Title should be less than 50 characters' })
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Description should be less than 150 characters' })
  description: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50, { message: 'cta text should be less than 50 characters' })
  ctaText: string;
}
