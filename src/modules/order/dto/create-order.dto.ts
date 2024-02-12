import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class PassCount {
  @ApiProperty()
  @IsNumber()
  adults: number;

  @ApiProperty()
  @IsNumber()
  children: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  stageId: string;

  @ApiProperty()
  @IsDate()
  reservedFor: Date;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  passCount: PassCount;
}
