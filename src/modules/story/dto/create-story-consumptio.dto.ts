import { CONSUMPTION_STATUS, STAGE_STORY_CONSUMPTION_STATUS } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, ValidateIf } from 'class-validator';

export class CreateStoryConsumptionDto {
  @ApiProperty()
  @IsString()
  @IsIn(STAGE_STORY_CONSUMPTION_STATUS)
  status: (typeof STAGE_STORY_CONSUMPTION_STATUS)[number];

  @ApiProperty()
  @IsString()
  @ValidateIf((model) => model.status === STAGE_STORY_CONSUMPTION_STATUS[CONSUMPTION_STATUS.PAUSED])
  timestamp?: string;
}

export interface StoryConsumptionResponseDto extends CreateStoryConsumptionDto {
  stageStoryId: string;
  userId: string;
}
