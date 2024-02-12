import { OnboardingMetaTranslation, PrismaClient } from '@prisma/client';

export const guidelinesMetaData: OnboardingMetaTranslation[] = [
  {
    localeId: 'en',
    title: 'Before you begin',
    description:
      'This guide will provide you valuable information to ensure a safe hiking experience',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    localeId: 'fr',
    title: 'Avant que tu commences',
    description:
      'Ce guide vous fournira des informations précieuses pour assurer une expérience de randonnée en toute sécurité',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const prisma = new PrismaClient();

export const seedOnboardingMetaGuidelines = async (): Promise<void> => {
  await prisma.$transaction(
    guidelinesMetaData.map((guideline) =>
      prisma.onboardingMetaTranslation.upsert({
        where: { localeId: guideline.localeId },
        update: guideline,
        create: guideline,
      }),
    ),
  );
};
