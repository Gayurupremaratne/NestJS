import { Exists } from '@common/validators/ExistsConstraint';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UserDelete {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  @Exists('user', 'id')
  id: string;
}
