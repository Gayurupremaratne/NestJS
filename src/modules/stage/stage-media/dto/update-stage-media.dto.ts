import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateStageMediaDto implements Prisma.StageMediaUpdateInput {
  @ApiProperty()
  mediaKey?: string;
  @Optional()
  userId?: string;

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
}
