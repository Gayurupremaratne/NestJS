import { PrismaClient, Region, RegionTranslation } from '@prisma/client';

export const regionData: Region[] = [
  {
    id: 1,
  },
  {
    id: 2,
  },
  {
    id: 3,
  },
  {
    id: 4,
  },
  {
    id: 5,
  },
];

export const regionTranslationData: RegionTranslation[] = [
  {
    id: 1,
    regionId: 1,
    localeId: 'en',
    name: 'Kandy',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    regionId: 1,
    localeId: 'fr',
    name: 'Kandy French',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    regionId: 1,
    localeId: 'de',
    name: 'Kandy German',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    regionId: 2,
    name: 'Hatton',
    localeId: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    regionId: 2,
    name: 'Hatton French',
    localeId: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 6,
    regionId: 2,
    name: 'Hatton German',
    localeId: 'de',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 7,
    regionId: 3,
    name: 'Haputale',
    localeId: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 8,
    regionId: 3,
    name: 'Haputale French',
    localeId: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 9,
    regionId: 3,
    name: 'Haputale German',
    localeId: 'de',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 10,
    regionId: 4,
    name: 'Ella',
    localeId: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 11,
    regionId: 4,
    name: 'Ella French',
    localeId: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 12,
    regionId: 4,
    name: 'Ella German',
    localeId: 'de',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 13,
    regionId: 5,
    name: 'Nuwara Eliya',
    localeId: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 14,
    regionId: 5,
    name: 'Nuwara Eliya French',
    localeId: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 15,
    regionId: 5,
    name: 'Nuwara Eliya German',
    localeId: 'de',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const regionSeedDelete: Region[] = [];

const prisma = new PrismaClient();

export const seedRegions = async (): Promise<void> => {
  await prisma.$transaction([
    ...regionData.map((region) =>
      prisma.region.upsert({
        where: { id: region.id },
        update: region,
        create: region,
      }),
    ),
    ...regionTranslationData.map((regionTranslation) =>
      prisma.regionTranslation.upsert({
        where: { id: regionTranslation.id },
        update: regionTranslation,
        create: regionTranslation,
      }),
    ),
    prisma.region.deleteMany({
      where: {
        id: {
          in: regionSeedDelete.map((regionRecord) => regionRecord.id),
        },
      },
    }),
    prisma.regionTranslation.deleteMany({
      where: {
        regionId: {
          in: regionSeedDelete.map((regionRecord) => regionRecord.id),
        },
      },
    }),
  ]);
};
