import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetEmergencyContactParamDto {
  @ApiProperty({ type: String })
  @IsUUID()
  @Exists('user', 'id')
  userId: string;
}
