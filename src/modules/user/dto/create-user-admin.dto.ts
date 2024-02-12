import { CreateUserDto } from './create-user.dto';
import { IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAdminDto extends CreateUserDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  emergencyContactCountryCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  emergencyContactNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO31661Alpha2()
  emergencyContactNumberNationalityCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  emergencyContactFullName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;
}
