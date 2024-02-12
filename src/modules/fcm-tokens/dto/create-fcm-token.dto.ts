import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateFcmTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  deviceToken: string;
}
