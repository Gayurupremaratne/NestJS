import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class FcmTokenIdentifierDto {
  @IsUUID()
  @Exists('user', 'id', NotFoundHelper)
  id: string;
}
