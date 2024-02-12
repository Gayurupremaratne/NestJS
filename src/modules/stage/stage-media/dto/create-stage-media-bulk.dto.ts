import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { StageMediaDto } from './stage-media.dto';
import { Type } from 'class-transformer';

export class CreateStageMediaBulkDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => StageMediaDto)
  mediaKeys: StageMediaDto[];
}
