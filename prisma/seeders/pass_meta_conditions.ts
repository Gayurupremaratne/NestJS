import { PassConditionMetaTranslation, PrismaClient } from '@prisma/client';

export const passConditionsMetaData: PassConditionMetaTranslation[] = [
  {
    localeId: 'en',
    title: 'Pass Conditions',
    description:
      'Important details and requirements to consider before requesting a pass for a trail stage.',
    subTitle: 'PLEASE READ INSTRUCTIONS CAREFULLY:',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    localeId: 'fr',
    title: 'Conditions de passage',
    description:
      'Détails et exigences importants à prendre en compte avant de demander un pass pour une étape de trail.',
    subTitle: 'VEUILLEZ LIRE ATTENTIVEMENT LES INSTRUCTIONS :',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const prisma = new PrismaClient();

export const seedPassMetaConditions = async (): Promise<void> => {
  await prisma.$transaction(
    passConditionsMetaData.map((passCondition) =>
      prisma.passConditionMetaTranslation.upsert({
        where: { localeId: passCondition.localeId },
        update: passCondition,
        create: passCondition,
      }),
    ),
  );
};
