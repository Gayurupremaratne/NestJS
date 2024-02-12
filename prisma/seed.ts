import { PrismaClient } from '@prisma/client';
import {
  seedLocales,
  seedPermissions,
  seedRegions,
  seedRolePermissions,
  seedRoles,
} from './seeders';

const prisma = new PrismaClient();

async function main() {
  await seedLocales();
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedRegions();
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
