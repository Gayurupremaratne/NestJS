import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBadgeTranslationDto {
  @IsUUID()
  @Exists('badge', 'id')
  badgeId?: string;

  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  description: string;
}
