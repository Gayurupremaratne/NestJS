import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class GuidelineTranslationParamDto {
  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}
