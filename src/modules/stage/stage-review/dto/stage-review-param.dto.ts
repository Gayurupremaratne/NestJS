import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StageReviewParamDto {
  @ApiProperty()
  @IsUUID()
  @Exists('stage', 'id')
  stageId: string;

  @ApiProperty()
  @IsUUID()
  @Exists('stageReview', 'id')
  stageReviewId: string;
}
