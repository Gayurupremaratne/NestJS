import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveorResolveReportAssetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: $Enums.FILE_REPORT_STATUS;
}
