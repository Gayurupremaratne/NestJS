import { Exclude } from 'class-transformer';

export class RoleDto {
  id?: number;

  name: string;

  createdAt?: Date;

  @Exclude()
  updatedAt?: Date;

  @Exclude()
  deletedAt?: Date;
}
