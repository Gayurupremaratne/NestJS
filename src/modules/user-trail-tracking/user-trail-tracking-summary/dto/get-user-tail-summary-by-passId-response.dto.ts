import { CreateUserTrailTrackingDto } from '../../dto/create-user-trail-tracking.dto';
import { PassesEntity, StageTranslationData } from '@app/modules/passes/dto';
import { Stage, UserAwardedBadge } from '@prisma/client';

export class GetUserTrailTrackingSummaryPassIdResponseDto extends CreateUserTrailTrackingDto {
  passes: PassesEntity & {
    stage: Stage & {
      stagesTranslation: Array<StageTranslationData>;
      userAwardedBadges: Array<UserAwardedBadge> &
        {
          badge: { badgeKey: string };
        }[];
    };
  };
}
