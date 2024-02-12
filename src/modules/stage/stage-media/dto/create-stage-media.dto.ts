import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStageMediaDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  stageId: string;

  @ApiProperty({ required: false })
  @IsString()
  type?: $Enums.STAGE_MEDIA_TYPES;

  @ApiProperty({ required: false })
  @IsString()
  mediaKey: string;

  @ApiProperty({ required: true })
  @IsString()
  mediaType: $Enums.STAGE_MEDIA_KEY_TYPES;

  @ApiProperty({ required: false })
  @IsNumber()
  @Optional()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Optional()
  @IsOptional()
  longitude?: number;

  @Optional()
  @Exclude()
  createdAt?: string | Date;

  @Optional()
  @Exclude()
  updatedAt?: string | Date;
}
