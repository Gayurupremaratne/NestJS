/**
 * Notice status enum for notices
 */

export enum NoticeStatusEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
}

export const NOTICE_STATUS = ['PENDING', 'PROCESSING', 'SENT'] as const;

export type NoticeStatus = (typeof NOTICE_STATUS)[number];

export const NOTICE_STATUS_CODE: Record<NoticeStatus, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SENT: 2,
};
