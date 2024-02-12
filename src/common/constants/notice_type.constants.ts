/**
 * Notice type enum for notices
 */

export enum NoticeTypeEnum {
  EMAIL = 'EMAIL',
  NOTIFICATION = 'NOTIFICATION',
  ALL = 'ALL',
}

export const NOTICE_TYPE = ['EMAIL', 'NOTIFICATION', 'ALL'] as const;

export type NoticeType = (typeof NOTICE_TYPE)[number];

export const NOTICE_TYPE_CODE: Record<NoticeType, number> = {
  EMAIL: 0,
  NOTIFICATION: 1,
  ALL: 2,
};
