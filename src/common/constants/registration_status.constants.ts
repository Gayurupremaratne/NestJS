/**
 * Profile status enum for user login and registration stages
 */
export const REGISTRATION_STATUS = [
  'PENDING_ACCOUNT',
  'PENDING_VERIFICATION',
  'PENDING_EMERGENCY',
  'PENDING_CONSENT',
  'COMPLETE',
  'PENDING_SOCIAL_ACCOUNT',
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUS)[number];

export const STATUS_CODE: { [key in RegistrationStatus]: number } = {
  PENDING_ACCOUNT: 0,
  PENDING_VERIFICATION: 1,
  PENDING_EMERGENCY: 2,
  PENDING_CONSENT: 3,
  COMPLETE: 4,
  PENDING_SOCIAL_ACCOUNT: 5,
};
