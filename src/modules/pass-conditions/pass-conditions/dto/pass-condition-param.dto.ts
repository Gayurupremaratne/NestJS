import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class PassConditionParamDto {
  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}
