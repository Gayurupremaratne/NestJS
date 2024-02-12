import { PassesEntity } from '@app/modules/passes/dto';
import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { CreateUserTrailTrackingDto } from './create-user-trail-tracking.dto';

export interface UserTrailTrackingDto extends CreateUserTrailTrackingDto {
  passes: PassesEntity & { stage: StageDto };
}
