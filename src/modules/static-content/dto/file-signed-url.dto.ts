import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class StaticContentSignedUrlDto {
  @IsString()
  @ApiProperty()
  fileName?: string;

  @IsString()
  @ApiProperty()
  contentType?: string;

  @IsString()
  @ApiProperty()
  module?: string;

  @IsNumber()
  @ApiProperty()
  fileSize: number;
}
