import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsString } from 'class-validator';

export class ReportAssetDto {
  @Exclude()
  id: string;

  @Optional()
  status: $Enums.FILE_REPORT_STATUS;

  @Exclude()
  userId: string;

  @Exclude()
  updatedAt: Date;

  @ApiProperty()
  @IsString()
  fileKey: string;

  @ApiProperty()
  @IsString()
  comment: string;
}
