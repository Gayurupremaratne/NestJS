import { IsCharacterCount } from '@common/validators/EditorCharacterCountCheck';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTranslationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsCharacterCount(2000)
  content: string;
}
