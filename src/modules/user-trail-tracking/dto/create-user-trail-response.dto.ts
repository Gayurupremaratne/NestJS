import { CreateUserTrailTrackingDto } from './create-user-trail-tracking.dto';
import { Passes } from '@prisma/client';

export interface UserTrailTrackingResponse extends CreateUserTrailTrackingDto {
  passes: Passes;
}
