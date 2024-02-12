import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class GetUserActivePassParamDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  stageId: string;
}
