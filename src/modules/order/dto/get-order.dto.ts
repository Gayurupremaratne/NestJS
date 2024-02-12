import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetOrdersByStageParams {
  @IsString()
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;
}

export class GetOrdersByStageQuery {
  @ApiPropertyOptional({ type: String })
  @IsInt()
  @IsOptional()
  perPage?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  pageNumber: number;

  @ApiProperty()
  @IsDate()
  date: Date;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
