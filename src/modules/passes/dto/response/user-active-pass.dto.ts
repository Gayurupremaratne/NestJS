import { IsNumber } from 'class-validator';
import { PassesEntity } from '../passes-entity.dto';

export class UserActivePass extends PassesEntity {
  @IsNumber()
  passValidityPeriod: number;
}
