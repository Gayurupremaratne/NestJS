import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DeleteAccountRequest {
  @ApiProperty({ type: String })
  @IsEmail()
  @Exists('user', 'email')
  email: string;
}
