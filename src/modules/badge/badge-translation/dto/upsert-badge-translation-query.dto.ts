import { Exists } from '@common/validators/ExistsConstraint';
import { IsString, IsUUID } from 'class-validator';

export class UpsertBadgeTranslationQueryDto {
  @IsUUID()
  @Exists('badge', 'id')
  badgeId: string;

  @IsString()
  @Exists('locale', 'code')
  localeId: string;
}
