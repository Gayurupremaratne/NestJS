import { Exists } from '@common/validators/ExistsConstraint';
import {
  TransformLatitude,
  TransformLongitude,
} from '@common/validators/transformLatitudeOrLongitude';
import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayUnique,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreatePointOfInterestTranslations {
  @ApiProperty({ type: String })
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty({ type: String })
  @IsString()
  title: string;

  @ApiProperty({ type: String })
  @IsString()
  description: string;
}

export class CreatePointOfInterestDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @TransformLatitude()
  latitude: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @TransformLongitude()
  longitude: number;

  @ApiProperty({ type: String })
  @IsString()
  @Exists('assetKeys', 'fileKey')
  assetKey: string;

  @ApiProperty({ type: [CreatePointOfInterestTranslations] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @ArrayUnique((item: CreatePointOfInterestTranslations) => item.localeId)
  @Type(() => CreatePointOfInterestTranslations)
  pointOfInterestTranslations: CreatePointOfInterestTranslations[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Optional()
  @ArrayUnique((item: string) => item)
  @Exists('stage', 'id')
  stageIds: string[];
}
