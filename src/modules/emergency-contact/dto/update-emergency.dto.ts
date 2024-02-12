import { Optional } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsISO31661Alpha2, IsOptional, IsString, IsUUID } from 'class-validator';

export class EmergencyContactAdminDto implements Prisma.EmergencyContactCreateInput {
  @ApiPropertyOptional({ type: String })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @Optional()
  countryCode?: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsISO31661Alpha2()
  contactNumberNationalityCode?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @Optional()
  contactNumber?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @Optional()
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  @Optional()
  relationship?: string;
}
