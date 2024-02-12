import { BADGE_TYPES } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateBadgeTranslationDto } from '../badge-translation/dto/create-badge-translation.dto';

export class CreateBadgeDto {
  @ApiProperty()
  @IsString()
  badgeKey: string;

  @ApiProperty()
  @IsString()
  type: (typeof BADGE_TYPES)[number];

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  stageId?: string;

  @ApiProperty()
  @ArrayMinSize(1)
  @Type(() => CreateBadgeTranslationDto)
  badgeTranslation: CreateBadgeTranslationDto[];
}
