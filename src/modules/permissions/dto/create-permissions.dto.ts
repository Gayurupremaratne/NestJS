import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { Optional } from '@nestjs/common';
import { RolePermission } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class CreatePermissionDto implements Omit<RolePermission, 'id'> {
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  @Exists('role', 'id', NotFoundHelper)
  roleId: number;

  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  @Exists('permissions', 'id', NotFoundHelper)
  permissionId: number;

  @Optional()
  createdAt: Date;

  @Optional()
  updatedAt: Date;

  @Optional()
  deletedAt: Date;
}
