import { ALPHABETS_SPACES_REGEX } from '@common/constants/global.constants';
import { REGISTRATION_STATUS } from '@common/constants/registration_status.constants';
import { Exists } from '@common/validators/ExistsConstraint';
import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  IsEmail,
  IsISO31661Alpha2,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  IsNumber,
} from 'class-validator';

export class CreateUserDto implements Prisma.UserCreateInput {
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @Matches(ALPHABETS_SPACES_REGEX, {
    message: 'Firstname can only have alphabets and spaces',
  })
  firstName: string;

  @ApiProperty()
  @IsString()
  @Matches(ALPHABETS_SPACES_REGEX, {
    message: 'Lastname can only have alphabets and spaces',
  })
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO31661Alpha2()
  nationalityCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^(\+?\d{1,15})$/)
  countryCode?: string;

  @ApiProperty({ required: false })
  @Optional()
  @IsOptional()
  @Matches(/^[0-9]{2,15}$/, {
    message: 'Number must be a valid contact number in the specified country',
  })
  contactNumber?: string;

  @ApiProperty({ required: false })
  @Optional()
  @IsOptional()
  @IsISO31661Alpha2()
  contactNumberNationalityCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[A-Z0-9]{5,9}$/, {
    message: 'Number must be a valid passport number in the specified country',
  })
  passportNumber?: string;

  @ApiProperty({ required: false })
  @Optional()
  @IsOptional()
  @Matches(/^([0-9]{9}[x|X|v|V]|[0-9]{12})$/, {
    message: 'NIC number should be in 950370203v (old) or 983746573894 (new) format',
  })
  nicNumber?: string;

  @ApiProperty({ required: false })
  @Optional()
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  preferredLocaleId: string;

  @ApiProperty()
  registrationStatus: (typeof REGISTRATION_STATUS)[number];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  role_id?: number;

  @IsOptional()
  @IsString()
  @Exists('assetKeys', 'fileKey')
  profileImageKey?: string;
}
