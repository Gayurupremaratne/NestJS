import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetUserTrailTrackingSummaryPassIdParamDto {
  @ApiProperty({ type: String })
  @IsUUID()
  @Exists('passes', 'id')
  passesId: string;
}
