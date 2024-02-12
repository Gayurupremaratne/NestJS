import { Locale, PrismaClient } from '@prisma/client';

export const localesData: Locale[] = [
  {
    code: 'en',
    nameEn: 'English',
    name: 'English',
  },
  {
    code: 'fr',
    nameEn: 'French',
    name: 'Français',
  },
  {
    code: 'de',
    nameEn: 'German',
    name: 'Deutsch',
  },
];

const localesSeedDelete: Locale[] = [];

const prisma = new PrismaClient();

export const seedLocales = async (): Promise<void> => {
  await prisma.$transaction([
    ...localesData.map((locale) =>
      prisma.locale.upsert({
        where: { code: locale.code },
        update: locale,
        create: locale,
      }),
    ),
    prisma.locale.deleteMany({
      where: {
        code: {
          in: localesSeedDelete.map((localeRecord) => localeRecord.code),
        },
      },
    }),
  ]);
};
