import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from '@common/constants';
export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString({ message: 'Please enter your password' })
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @MaxLength(50, { message: 'Password must have less than 50 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must have at least 8 characters, 1 capital letter, and 1 special character (@,$,!,%,*,?,&)',
  })
  newPassword: string;
}
