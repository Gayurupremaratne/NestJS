import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StoryMediaRequestDto {
  @ApiProperty()
  @IsString()
  @Exists('stage', 'id')
  stageId: string;
}
