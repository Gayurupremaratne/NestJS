export class StageReviewDto {
  id?: string;

  userId: string;

  stageId: string;

  rating: number;

  review: string;

  createdAt?: Date;

  updatedAt?: Date;
}
