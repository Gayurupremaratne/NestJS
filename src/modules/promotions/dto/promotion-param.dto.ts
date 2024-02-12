import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsUUID } from 'class-validator';

export class PromotionParamDto {
  @IsUUID()
  @Exists('promotions', 'id', NotFoundHelper)
  id: string;
}
