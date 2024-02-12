import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsString, ValidateIf } from 'class-validator';

export class BatchUpdatePassInventoryDto {
  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsDate()
  startDate: Date;
  @ApiProperty()
  @IsDate()
  endDate: Date;

  @ApiProperty()
  @IsBoolean()
  stageClosure: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((model) => model.stageClosure === true)
  stageClosureReason?: string;
}
