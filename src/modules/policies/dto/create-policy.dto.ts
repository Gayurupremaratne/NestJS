import { Unique } from '@common/validators/UniqueConstraint';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePolicyDto {
  @ApiProperty()
  @IsBoolean()
  acceptanceRequired: boolean;

  @ApiProperty()
  @IsString()
  @ValidateIf(
    (model, _value) => model.parentPolicyId === null || typeof model.parentPolicyId === 'undefined',
  )
  icon: string;

  @ApiProperty()
  @IsBoolean()
  isGroupParent: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentPolicyId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Unique('policy', 'slug')
  slug?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  order: number;
}
