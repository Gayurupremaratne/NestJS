import { PASSWORD_REGEX } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @ApiProperty()
  email: string;
}

export class RecoverCodeDto extends ForgotPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class ResetPasswordDto extends RecoverCodeDto {
  @ApiProperty()
  @IsString({ message: 'Please enter your password' })
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @MaxLength(50, { message: 'Password must have less than 16 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must have at least 8 characters, 1 capital letter, and 1 special character (@,$,!,%,*,?,&)',
  })
  newPassword: string;
}
