import { RolePermission, PrismaClient } from '@prisma/client';

export const rolePermissiondSeedData: RolePermission[] = [
  {
    id: '2aebd52b-b56d-41d6-ba38-943b91e64fa8',
    roleId: 1,
    permissionId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: '536408bd-a8ce-4f55-b353-04aa2e68f540',
    roleId: 1,
    permissionId: 94,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'b4f7d363-d5a8-4af0-8d9c-a724db9b272c',
    roleId: 2,
    permissionId: 13,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'a7b6d495-f47c-4562-bb18-31c9e2afcc08',
    roleId: 2,
    permissionId: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'bd304a58-8663-4ef8-aa08-2b7075dcc0f0',
    roleId: 2,
    permissionId: 21,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: '7689f7fe-12ec-4658-9a7a-f5de3d74cd2d',
    roleId: 2,
    permissionId: 26,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'ee3c521d-124a-499a-8ff8-0e8d6da12581',
    roleId: 2,
    permissionId: 31,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: '2975acd3-e69c-4cf6-9fe3-fa482e5555a4',
    roleId: 2,
    permissionId: 36,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: '71d3e9c1-ecc5-4c22-a5b7-eef96fd2c98a',
    roleId: 3,
    permissionId: 37,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'a63f04b4-856e-4125-9aab-e2c39668b90a',
    roleId: 2,
    permissionId: 43,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'fd1d753a-748b-4d92-8dfd-555e602bc18e',
    roleId: 2,
    permissionId: 48,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'eceecdd5-96ef-4c80-8410-0adac4b860f5',
    roleId: 2,
    permissionId: 108,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const rolePermissionSeedDelete: RolePermission[] = [
  {
    id: '4f8e0ddf-92d7-4264-a515-f52cd549adbf',
    roleId: 2,
    permissionId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'd2c69de2-f569-4336-b8a8-939aae6c331c',
    roleId: 2,
    permissionId: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'eceecdd5-96ef-4c80-8410-0adac4b860f4',
    roleId: 2,
    permissionId: 72,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const prisma = new PrismaClient();

export const seedRolePermissions = async (): Promise<void> => {
  await prisma.$transaction([
    ...rolePermissiondSeedData.map((rolePermission) =>
      prisma.rolePermission.upsert({
        where: { id: rolePermission.id },
        update: rolePermission,
        create: rolePermission,
      }),
    ),
    prisma.rolePermission.deleteMany({
      where: {
        id: {
          in: rolePermissionSeedDelete.map((rolePermissionRecord) => rolePermissionRecord.id),
        },
      },
    }),
  ]);
};
