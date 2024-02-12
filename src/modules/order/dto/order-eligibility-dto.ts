import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';

export class OrderEligibilityQuery {
  @ApiProperty()
  @IsString()
  stageId: string;

  @ApiProperty()
  @IsDate()
  reservedDate: Date;
}

export class OrderEligibilityResponse {
  stageId: string;
  reservedDate: Date;
  isEligible: boolean;
}
