/**
 * Badge type enum for badges
 */
export const BADGE_TYPES = ['STAGE_COMPLETION', 'MANUAL'] as const;

export type BadgeTypes = (typeof BADGE_TYPES)[number];

export const BADGE_TYPE_CODE: { [key in BadgeTypes]: number } = {
  STAGE_COMPLETION: 0,
  MANUAL: 1,
};
