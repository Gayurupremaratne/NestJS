export interface DateQueryDto {
  startDate?: {
    lte?: Date;
    gt?: Date;
    gte?: Date;
  };
  endDate?: {
    lt?: Date;
    gt?: Date;
    gte?: Date;
  };
}
