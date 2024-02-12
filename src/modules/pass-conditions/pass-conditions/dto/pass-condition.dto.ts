import { Exclude } from 'class-transformer';

export class PassConditionDto {
  localeId: string;

  order: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
