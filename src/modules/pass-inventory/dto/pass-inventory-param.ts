import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsString } from 'class-validator';

export class PassInventoryIdentifierDto {
  @IsString()
  @Exists('passInventory', 'id', NotFoundHelper)
  id: string;
}
