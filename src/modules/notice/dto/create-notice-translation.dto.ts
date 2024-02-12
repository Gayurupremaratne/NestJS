import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNoticeTranslationDto {
  @IsUUID()
  @Exists('notices', 'id')
  noticeId?: string;

  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;
}
