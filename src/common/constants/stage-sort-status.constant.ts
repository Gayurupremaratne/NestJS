/**
 * Stage open enum for sorting
 */
export const STAGE_SORT_STATUS_TYPE = ['open', 'close', 'all'] as const;

export type StageSortStatusType = (typeof STAGE_SORT_STATUS_TYPE)[number];

export const STAGE_SORT_STATUS_TYPE_CODE: { [key in StageSortStatusType]: number } = {
  close: 0,
  open: 1,
  all: 3,
};
