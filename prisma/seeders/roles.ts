import { PrismaClient, Role } from '@prisma/client';
import { RoleType } from '../../src/common/constants/role_type.constants';

export const roledSeedData: Role[] = [
  {
    id: RoleType.SuperAdmin,
    name: RoleType[RoleType.SuperAdmin],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: RoleType.Hiker,
    name: RoleType[RoleType.Hiker],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: RoleType.Banned,
    name: RoleType[RoleType.Banned],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const prisma = new PrismaClient();

export const seedRoles = async (): Promise<void> => {
  await prisma.$transaction(
    roledSeedData.map((role) =>
      prisma.role.upsert({
        where: { id: role.id },
        update: role,
        create: role,
      }),
    ),
  );
};
