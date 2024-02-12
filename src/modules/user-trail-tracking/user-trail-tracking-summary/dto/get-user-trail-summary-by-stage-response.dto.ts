import { CreateUserTrailTrackingDto } from '../../dto/create-user-trail-tracking.dto';
import { OrderDto } from '@app/modules/order/dto/order.dto';
import { Passes, Stage } from '@prisma/client';
import { StageTranslationData } from '@app/modules/passes/dto';

export interface GetUserTrailSummaryStageResponse extends Passes {
  stage: Stage & { stagesTranslation: Array<StageTranslationData> };
  userTrailTracking: Partial<CreateUserTrailTrackingDto>;
  order: Partial<OrderDto>;
}
