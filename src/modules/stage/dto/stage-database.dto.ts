import { STAGE_DIFFICULTY_TYPES } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class StageDatabaseDto {
  @ApiProperty()
  @IsNumber()
  distance: number;

  @ApiProperty()
  estimatedDuration: number;

  @ApiProperty()
  openTime: string | Date;

  @ApiProperty()
  closeTime: string | Date;

  @ApiProperty()
  @IsNumber()
  elevationGain: number;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  open: boolean;

  @ApiProperty()
  @IsNumber()
  number: number;

  @ApiProperty()
  difficultyType: (typeof STAGE_DIFFICULTY_TYPES)[number];

  @ApiProperty()
  @IsOptional()
  kmlFileKey: string;

  @ApiProperty()
  @IsOptional()
  startPoint: number[];

  @ApiProperty()
  @IsOptional()
  endPoint: number[];
}
