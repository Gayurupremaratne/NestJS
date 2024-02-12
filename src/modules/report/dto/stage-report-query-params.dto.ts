import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StageReportQueryParamsDto {
  @ApiProperty({ required: true })
  @IsString()
  reservedForStartDate: string;

  @ApiProperty({ required: true })
  @IsString()
  reservedForEndDate: string;
}
