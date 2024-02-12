/**
 * Category enum for notices
 */
export const NOTICE_CATEGORY = ['GENERAL', 'STAGE_WISE'] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORY)[number];

export const NOTICE_CATEGORY_CODE: Record<NoticeCategory, number> = {
  GENERAL: 0,
  STAGE_WISE: 1,
};
