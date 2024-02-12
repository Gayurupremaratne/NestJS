import { StageData } from '.';

export class PassOrdersAggregate {
  orderId: string;
  userId: string;
  stageId: string;
  reservedFor: string;
  passCount: number;
  // Added optional Stage Data to loop and append the response
  stageData?: Partial<StageData>;
}
