import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UserFavouriteStagePaginationDto {
  @ApiProperty()
  @IsInt()
  @IsOptional({ always: true })
  perPage: number;

  @ApiProperty()
  @IsInt()
  @IsOptional({ always: true })
  pageNumber: number;
}
