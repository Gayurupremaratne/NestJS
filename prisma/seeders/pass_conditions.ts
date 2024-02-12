import { PassConditionTranslation, PrismaClient } from '@prisma/client';

export const passConditionsData: PassConditionTranslation[] = [
  {
    content: 'Strict adherence to opening and closing times, plan your trip accordingly.',
    localeId: 'en',
    order: 1,
  },
  {
    content:
      'Respect strict des horaires d’ouverture et de fermeture, planifiez votre voyage en conséquence.',
    localeId: 'fr',
    order: 1,
  },
  {
    content: 'Please follow all rules, regulations and guidelines.',
    localeId: 'en',
    order: 2,
  },
  {
    content: 'Veuillez suivre toutes les règles, réglementations et directives.',
    localeId: 'fr',
    order: 2,
  },
  {
    content: 'Tickets are non-transferrable to other persons.',
    localeId: 'en',
    order: 3,
  },
  {
    content: 'Les billets ne sont pas transférables à d’autres personnes.',
    localeId: 'fr',
    order: 3,
  },
  {
    content:
      'Trail stages may be closed at short notice based on the discretion of the trail management organization due to unavoidable circumstances. Any changes will be notified via email and mobile app.',
    localeId: 'en',
    order: 4,
  },
  {
    content:
      'Les étapes du trail peuvent être fermées à bref délai, à la discrétion de lorganisation de gestion du trail, en raison de circonstances inévitables. Tout changement sera notifié par e-mail et par application mobile.',
    localeId: 'fr',
    order: 4,
  },
  {
    content:
      'The validity of each trail pass will be limited for the specific stage for that specific date.',
    localeId: 'en',
    order: 5,
  },
  {
    content: `La validité de chaque pass trail sera limitée pour l'étape spécifique à cette date spécifique.`,
    localeId: 'fr',
    order: 5,
  },
];

const prisma = new PrismaClient();

export const seedPassConditions = async (): Promise<void> => {
  await prisma.$transaction(
    passConditionsData.map((passCondition) =>
      prisma.passConditionTranslation.upsert({
        where: { order_localeId: { order: passCondition.order, localeId: passCondition.localeId } },
        update: passCondition,
        create: passCondition,
      }),
    ),
  );
};
