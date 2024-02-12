import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty } from 'class-validator';

export class CreateStageRegionDto {
  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  regionIds: number[];
}
