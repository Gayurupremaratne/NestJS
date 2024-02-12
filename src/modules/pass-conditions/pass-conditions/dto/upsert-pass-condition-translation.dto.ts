import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class UpsertPassConditionTranslationDto {
  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty()
  @IsString()
  content: string;
}
