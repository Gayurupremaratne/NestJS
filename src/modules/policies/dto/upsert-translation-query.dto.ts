import { Exists } from '@common/validators/ExistsConstraint';
import { IsString, IsUUID } from 'class-validator';

export class UpsertTranslationQueryDto {
  @IsUUID()
  @Exists('policy', 'id')
  policyId: string;

  @IsString()
  @Exists('locale', 'code')
  localeId: string;
}
