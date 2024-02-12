import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class EmergencyContactDto implements Prisma.EmergencyContactCreateInput {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  countryCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contactNumber: string;

  @ApiProperty({ required: false })
  @IsISO31661Alpha2()
  contactNumberNationalityCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @Optional()
  @IsString()
  relationship?: string;
}
export class EmergencyContactExtendedDto extends EmergencyContactDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
