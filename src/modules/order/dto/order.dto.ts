export class OrderDto {
  id: string;

  userId: string;

  stageId: string;

  reservedFor: Date;

  isRescheduled: boolean;

  createdAt?: Date;

  updatedAt?: Date;
}

export class OrdersByStageDto {
  orderId: string;

  userId: string;

  stageId: string;

  reservedFor: Date;

  passCount: number;
}
