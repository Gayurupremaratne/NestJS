import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class PassConditionMetaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  subTitle: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
