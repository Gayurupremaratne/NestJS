import { Exclude } from 'class-transformer';

export class UserPermissionsDto {
  id?: string;

  @Exclude()
  role_id?: number;

  action?: string;

  subject?: string;

  @Exclude()
  inverted?: boolean;

  conditions?: object;

  @Exclude()
  reason?: string;

  @Exclude()
  createdAt?: Date;

  @Exclude()
  updatedAt?: Date;

  @Exclude()
  deletedAt?: Date;
}
