import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateStoryTranslations {
  @ApiProperty({ type: String })
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty({ type: String })
  @IsString()
  @Exists('assetKeys', 'fileKey')
  audioKey: string;

  @ApiProperty({ type: String })
  @IsString()
  title: string;

  @ApiProperty({ type: String })
  @IsString()
  description: string;
}
