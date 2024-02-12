import { IsNumber } from 'class-validator';
import { CreateStageDto } from './create-stage.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStageDto extends CreateStageDto {
  @ApiProperty()
  @IsNumber()
  cumulativeReviews?: number;

  @ApiProperty()
  @IsNumber()
  reviewsCount?: number;
}
