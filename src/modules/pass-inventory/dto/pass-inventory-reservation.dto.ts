import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PassInventoryAggregateReservationParamDto {
  @ApiProperty()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;
}

export class PassInventoryAggregateReservationQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty()
  @IsNotEmpty()
  endDate: string;
}
