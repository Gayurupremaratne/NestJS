import { OnboardingGuidelineTranslation, PrismaClient } from '@prisma/client';

export const guidelinesData: OnboardingGuidelineTranslation[] = [
  {
    content: 'Stay on the trail at all times and follow the rules, regulations, and guidelines.',
    localeId: 'en',
    order: 1,
  },
  {
    content:
      'Restez sur la piste à tout moment et suivez les règles, les règlements et les directives.',
    localeId: 'fr',
    order: 1,
  },
  {
    content:
      'The Trail is a nature trail – biopiracy and damage to the environment is punishable by law.',
    localeId: 'en',
    order: 2,
  },
  {
    content:
      'Le Trail est un sentier nature - la biopiraterie et les dommages à lenvironnement sont punis par la loi.',
    localeId: 'fr',
    order: 2,
  },
  {
    content: 'The trail pass should be on your device at all times, during your walk.',
    localeId: 'en',
    order: 3,
  },
  {
    content:
      'Le laissez-passer doit être sur votre appareil à tout moment, pendant votre promenade',
    localeId: 'fr',
    order: 3,
  },
  {
    content: 'Be respectful of communities, plantation workers, and other travelers.',
    localeId: 'en',
    order: 4,
  },
  {
    content:
      'Soyez respectueux des communautés, des travailleurs des plantations et des autres voyageurs',
    localeId: 'fr',
    order: 4,
  },
  {
    content:
      'You accept that there are inherent risks from (including but not limited to) wild animals, adverse weather conditions, and terrain.',
    localeId: 'en',
    order: 5,
  },
  {
    content: `Vous acceptez qu'il existe des risques inhérents (y compris, mais sans s'y limiter) aux animaux sauvages, aux conditions météorologiques défavorables et au terrai`,
    localeId: 'fr',
    order: 5,
  },
];

const prisma = new PrismaClient();

export const seedOnboardingGuidelines = async (): Promise<void> => {
  await prisma.$transaction(
    guidelinesData.map((guideline) =>
      prisma.onboardingGuidelineTranslation.upsert({
        where: { order_localeId: { order: guideline.order, localeId: guideline.localeId } },
        update: guideline,
        create: guideline,
      }),
    ),
  );
};
