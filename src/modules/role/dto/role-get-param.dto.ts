import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';
export class RoleIdentifierDto {
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  @Exists('role', 'id', NotFoundHelper)
  id: number;
}
