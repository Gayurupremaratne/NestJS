import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { STAGE_DESCRIPTION_CHARACTER_LENGTH } from '../../constants';

export class UpdateStageTranslationDto {
  @ApiProperty()
  @IsString()
  stageId: string;

  @ApiProperty()
  @IsString()
  localeId: string;

  @ApiProperty()
  @IsString()
  stageHead: string;

  @ApiProperty()
  @IsString()
  stageTail: string;

  @ApiProperty()
  @IsString()
  @MaxLength(STAGE_DESCRIPTION_CHARACTER_LENGTH, {
    message: `Stage description cannot exceed more than ${STAGE_DESCRIPTION_CHARACTER_LENGTH} characters`,
  })
  description: string;
}
