import { Exists } from '@common/validators/ExistsConstraint';
import {
  TransformLatitude,
  TransformLongitude,
} from '@common/validators/transformLatitudeOrLongitude';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsUUID } from 'class-validator';

export class CreateUserTrailTrackingDto {
  @ApiProperty()
  @IsUUID()
  @Exists('passes', 'id')
  passesId: string;

  @ApiProperty()
  @IsNumber()
  averagePace: number;

  @ApiProperty()
  @IsNumber()
  averageSpeed: number;

  @ApiProperty()
  @IsNumber()
  distanceTraveled: number;

  @ApiProperty()
  @IsNumber()
  elevationGain: number;

  @ApiProperty()
  @IsNumber()
  elevationLoss: number;

  @ApiProperty()
  @IsNumber()
  @TransformLatitude()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @TransformLongitude()
  longitude: number;

  @ApiProperty()
  @IsNumber()
  totalTime: number;

  @ApiProperty()
  @IsDateString()
  @Transform(({ value }) => {
    return new Date(value).toISOString();
  })
  startTime: Date;

  @ApiProperty()
  @IsNumber()
  completion: number;

  @ApiProperty()
  @IsBoolean()
  isCompleted: boolean;

  @ApiProperty()
  @IsDateString()
  @Transform(({ value }) => {
    return new Date(value).toISOString();
  })
  timestamp: Date;

  @Exclude()
  isActiveTrack?: boolean;
}
