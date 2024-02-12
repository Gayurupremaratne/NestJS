export enum PassType {
  ACTIVE = 'active',
  RESERVED = 'reserved',
  EXPIRED = 'expired',
}

/**
 * User type enum for passes
 */
export const PASS_USER_TYPE = ['ADULT', 'CHILD'] as const;

export type PassUserType = (typeof PASS_USER_TYPE)[number];

export const PASS_USER_TYPE_CODE: { [key in PassUserType]: number } = {
  ADULT: 0,
  CHILD: 1,
};
