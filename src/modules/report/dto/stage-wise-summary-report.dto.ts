import { User } from './cancelled-passes.dto';

export class StageWiseSummaryReportDto {
  bookingDate: Date;
  user: User;
  stageId: string;
  reservedFor: Date;
  passCount: number;
}
