import { Permission, Prisma } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class PermissionsDto implements Permission {
  id: number;

  action: string;

  permissionName: string;

  subject: string;

  inverted: boolean;

  @Exclude()
  conditions: Prisma.JsonValue;

  @Exclude()
  reason: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;
}
