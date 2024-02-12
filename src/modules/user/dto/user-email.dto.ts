import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserEmailDto {
  @ApiProperty()
  @IsString()
  email: string;
}

export class UserEmail {
  id: string;
  email: string;
}
