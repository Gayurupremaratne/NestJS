export const STAGE_STORY_CONSUMPTION_STATUS = ['UNPLAYED', 'PLAYING', 'PAUSED', 'PLAYED'] as const;

export type StageStoryConsumptionStatus = (typeof STAGE_STORY_CONSUMPTION_STATUS)[number];

export const CONSUMPTION_STATUS: { [key in StageStoryConsumptionStatus]: number } = {
  UNPLAYED: 0,
  PLAYING: 1,
  PAUSED: 2,
  PLAYED: 3,
};
