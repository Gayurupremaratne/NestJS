import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { Transform } from 'class-transformer';
import { IsNumber, IsString, IsUUID } from 'class-validator';

export class RoleAssignParamsDto {
  @IsString()
  @IsUUID()
  @Exists('user', 'id', NotFoundHelper)
  userId?: string;

  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  @Exists('role', 'id', NotFoundHelper)
  roleId?: number;
}
