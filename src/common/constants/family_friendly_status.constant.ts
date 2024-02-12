/**
 * Family friendly status enum for stages
 */
export const FAMILY_FRIENDLY_STATUS = ['NO', 'YES'] as const;

export type FamilyFriendlyStatus = (typeof FAMILY_FRIENDLY_STATUS)[number];

export const FAMILY_FRIENDLY_STATUS_CODE: { [key in FamilyFriendlyStatus]: number } = {
  NO: 0,
  YES: 1,
};
