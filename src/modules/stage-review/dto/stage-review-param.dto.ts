import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StageReviewParamDto {
  @ApiProperty()
  @IsUUID()
  @Exists('stageReview', 'id')
  stageReviewId: string;
}
