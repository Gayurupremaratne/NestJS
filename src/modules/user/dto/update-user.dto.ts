import { REGISTRATION_STATUS } from '@common/constants';
import { PartialType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  id?: string;

  @Exclude()
  email: string;

  @Exclude()
  registrationStatus: (typeof REGISTRATION_STATUS)[number];
}
