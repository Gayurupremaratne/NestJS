import { Exists } from '@common/validators/ExistsConstraint';
import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateStoryTranslations } from './story-translation.dto';
import {
  TransformLatitude,
  TransformLongitude,
} from '@common/validators/transformLatitudeOrLongitude';

export class CreateStoryDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @TransformLatitude()
  latitude: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @TransformLongitude()
  longitude: number;

  @ApiProperty({ type: [CreateStoryTranslations] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @ArrayUnique((item: CreateStoryTranslations) => item.localeId + item.audioKey)
  @Type(() => CreateStoryTranslations)
  stageStoryTranslations: CreateStoryTranslations[];

  @ApiProperty({ type: String })
  @IsOptional()
  @Optional()
  @IsUUID()
  @Exists('stage', 'id')
  stageId?: string;
}
