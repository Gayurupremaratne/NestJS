import { Unique } from '@common/validators/UniqueConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsString } from 'class-validator';

export class CreateRoleDto implements Prisma.RoleCreateInput {
  @ApiProperty()
  @IsString()
  @Unique('role', 'name', null, 'Role already exists')
  name: string;
}
