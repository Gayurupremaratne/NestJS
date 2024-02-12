import { CreateUserDto } from '@user/dto/create-user.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from '@common/constants';
export class CreateAccountDto extends OmitType(CreateUserDto, [
  'id',
  'registrationStatus',
  'role_id',
]) {
  @ApiProperty()
  @IsString({ message: 'Please enter your password' })
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @MaxLength(50, { message: 'Password must have less than 50 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must have at least 8 characters, 1 capital letter, and 1 special character (@,$,!,%,*,?,&)',
  })
  password: string;
}
