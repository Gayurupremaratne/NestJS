import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class PolicyIdentifierDto {
  @IsUUID()
  @Exists('policy', 'id', NotFoundHelper)
  id: string;
}
