import { STAGE_DIFFICULTY_TYPES } from '@common/constants';
import { FAMILY_FRIENDLY_STATUS } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS } from '@common/constants/people_interaction.constant';
import { IsTimeWithoutDate } from '@common/decorators/isTimeWithoutDate.decorator';
import { Duration } from '@common/types';
import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateStageDto {
  @ApiProperty()
  @IsNumber()
  distance: number;

  @ApiProperty()
  @IsObject()
  estimatedDuration: Duration;

  @ApiProperty()
  @IsTimeWithoutDate()
  openTime: string;

  @ApiProperty()
  @IsTimeWithoutDate()
  closeTime: string;

  @ApiProperty()
  @IsNumber()
  elevationGain: number;

  @ApiProperty()
  @IsBoolean()
  open: boolean;

  @ApiProperty()
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty()
  @IsString()
  difficultyType: (typeof STAGE_DIFFICULTY_TYPES)[number];

  @ApiProperty()
  @IsString()
  peopleInteraction: (typeof PEOPLE_INTERACTIONS)[number];

  @ApiProperty()
  @IsString()
  familyFriendly: (typeof FAMILY_FRIENDLY_STATUS)[number];

  @ApiProperty()
  @IsOptional()
  @Optional()
  kmlFileKey: string;

  @ApiProperty()
  @IsOptional()
  @Optional()
  startPoint: number[];

  @ApiProperty()
  @IsOptional()
  @Optional()
  endPoint: number[];
}
