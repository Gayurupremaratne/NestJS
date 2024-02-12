import { BADGE_TYPES } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateBadgeTranslationDto } from '../badge-translation/dto/create-badge-translation.dto';
import { Type } from 'class-transformer';

export class UpdateBadgeDto {
  @ApiProperty()
  @IsString()
  type: (typeof BADGE_TYPES)[number];

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  stageId?: string;

  @ApiProperty()
  @IsString()
  badgeKey: string;

  @ApiProperty()
  @ArrayMinSize(1)
  @Type(() => CreateBadgeTranslationDto)
  badgeTranslation: CreateBadgeTranslationDto[];
}
