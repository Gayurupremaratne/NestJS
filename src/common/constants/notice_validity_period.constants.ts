/**
 * Notice validity period enum for notices
 */

export enum NoticeValidityPeriodEnum {
  YES = 'YES',
  NO = 'NO',
}

export const NOTICE_VALIDITY_PERIOD = ['YES', 'NO'] as const;

export type NoticeValidityPeriod = (typeof NOTICE_VALIDITY_PERIOD)[number];

export const NOTICE_VALIDITY_PERIOD_CODE: Record<NoticeValidityPeriod, number> = {
  YES: 0,
  NO: 1,
};
