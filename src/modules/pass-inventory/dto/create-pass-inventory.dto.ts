import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { Optional } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class CreatePassInventoryDto {
  @IsString()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;

  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  quantity: number;

  @IsDate()
  date: Date;

  @Optional()
  createdAt?: Date;

  @Optional()
  updatedAt?: Date;
}
