import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsNumber } from 'class-validator';

export class UserRoleIdentifierDto {
  @IsNumber()
  @Exists('role', 'id', NotFoundHelper)
  id: number;
}
