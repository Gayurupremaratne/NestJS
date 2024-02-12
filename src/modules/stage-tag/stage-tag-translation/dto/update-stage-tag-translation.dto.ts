import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateStageTagTranslationDto {
  @ApiProperty()
  @IsString()
  name: string;
}
